import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurazione Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('Credenziali Airtable mancanti');
}

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: apiKey
});

const base = Airtable.base(baseId);

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 DEBUG: Ricerca partite bloccate con votazioni aperte...');
    
    // 1. Trova tutte le partite completate (potrebbero avere votazioni aperte)
    const completedMatches = await base('matches').select({
      filterByFormula: `{completed} = TRUE()`
    }).all();

    console.log(`🔍 Trovate ${completedMatches.length} partite completate`);

    const results = [];
    
    for (const match of completedMatches) {
      const matchId = match.get('IDmatch') as string;
      const matchDate = match.get('date') as string;
      const teamA = JSON.parse(match.get('teamA') as string || '[]');
      const teamB = JSON.parse(match.get('teamB') as string || '[]');
      const allPlayers = [...teamA, ...teamB];
      
      // Calcola tempo trascorso dalla data della partita
      let hoursElapsed = 0;
      let isTimeout = false;
      
      if (matchDate) {
        const matchTime = new Date(matchDate).getTime();
        const now = new Date().getTime();
        const timeElapsed = now - matchTime;
        hoursElapsed = timeElapsed / (60 * 60 * 1000);
        isTimeout = hoursElapsed > 24; // Timeout dopo 24 ore
      }
      
      // Controlla i voti per questa partita
      const voteRecords = await base('votes').select({
        filterByFormula: `{matchId} = "${matchId}"`
      }).all();
      
      // Usa fromPlayerId (campo corretto nella tabella votes)
      const uniqueVoters = new Set(
        voteRecords
          .map(vote => vote.get('fromPlayerId') as string)
          .filter(email => email != null && email !== '') // Filtra valori nulli/vuoti
      );
      const votersFromMatch = allPlayers.filter(email => uniqueVoters.has(email));
      
      // Una partita è "bloccata" se:
      // 1. È passato più di 1 ora dalla partita E
      // 2. Non tutti i giocatori hanno votato
      const isStuck = hoursElapsed > 1 && votersFromMatch.length < allPlayers.length;
      
      // Aggiungi solo partite che potrebbero essere bloccate o in attesa
      if (isStuck || votersFromMatch.length < allPlayers.length) {
        results.push({
          matchId,
          matchDate,
          hoursElapsed: Math.round(hoursElapsed * 10) / 10,
          isTimeout,
          isStuck,
          totalPlayers: allPlayers.length,
          playersVoted: votersFromMatch.length,
          playersWhoVoted: Array.from(uniqueVoters),
          playersWhoHaventVoted: allPlayers.filter(email => !uniqueVoters.has(email)),
          teamA,
          teamB,
          scoreA: match.get('scoreA'),
          scoreB: match.get('scoreB'),
          status: isTimeout ? 'TIMEOUT_STUCK' : (isStuck ? 'STUCK' : 'WAITING_VOTES'),
          voteRecordsFound: voteRecords.length
        });
      }
    }
    
    // Ordina per ore trascorse (i più bloccati prima)
    results.sort((a, b) => b.hoursElapsed - a.hoursElapsed);
    
    const stuckCount = results.filter(r => r.isStuck).length;
    const timeoutCount = results.filter(r => r.isTimeout).length;
    
    console.log(`🔍 DEBUG completato - ${results.length} partite con problemi di votazione`);
    console.log(`📊 Bloccate: ${stuckCount}, Timeout: ${timeoutCount}`);
    
    return NextResponse.json({
      success: true,
      message: `Trovate ${results.length} partite con votazioni incomplete`,
      stuckMatches: stuckCount,
      timeoutMatches: timeoutCount,
      waitingMatches: results.filter(r => !r.isStuck && !r.isTimeout).length,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Errore nel debug partite bloccate:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel debug partite bloccate',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { matchId, forceFinalize } = await req.json();
    
    console.log('🔧 DEBUG: Riparazione partita bloccata:', { matchId, forceFinalize });
    
    if (!matchId) {
      return NextResponse.json({
        success: false,
        error: 'matchId richiesto'
      }, { status: 400 });
    }
    
    if (forceFinalize) {
      // Forza la finalizzazione
      console.log('🔧 Forzando finalizzazione per partita:', matchId);
      
      try {
        // Usa localhost:3001 invece di NEXTAUTH_URL
        const finalizeResponse = await fetch(`http://localhost:3001/api/matches/${matchId}/finalize-voting`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const finalizeData = await finalizeResponse.json();
        
        if (finalizeData.success) {
          console.log('✅ Partita finalizzata forzatamente:', matchId);
          
          return NextResponse.json({
            success: true,
            message: 'Partita finalizzata forzatamente',
            matchId,
            finalizeData
          });
        } else {
          console.log('❌ Errore nella finalizzazione forzata:', finalizeData.error);
          
          return NextResponse.json({
            success: false,
            error: 'Errore nella finalizzazione forzata',
            details: finalizeData.error
          }, { status: 500 });
        }
      } catch (finalizeError) {
        console.error('❌ Errore durante finalizzazione forzata:', finalizeError);
        
        return NextResponse.json({
          success: false,
          error: 'Errore durante finalizzazione forzata',
          details: finalizeError instanceof Error ? finalizeError.message : 'Errore sconosciuto'
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Azione non specificata'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Errore nella riparazione partita:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nella riparazione partita',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 