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
    
    // 1. Trova tutte le partite con votazioni aperte
    const openVotingMatches = await base('matches').select({
      filterByFormula: `{voting_status} = 'open'`
    }).all();

    console.log(`🔍 Trovate ${openVotingMatches.length} partite con votazioni aperte`);

    const results = [];
    
    for (const match of openVotingMatches) {
      const matchId = match.get('IDmatch') as string;
      const votingStartedAt = match.get('voting_started_at') as string;
      const createdAt = match.get('created_at') as string;
      const teamA = JSON.parse(match.get('teamA') as string || '[]');
      const teamB = JSON.parse(match.get('teamB') as string || '[]');
      const allPlayers = [...teamA, ...teamB];
      
      // Calcola tempo trascorso
      let hoursElapsed = 0;
      let isTimeout = false;
      
      if (votingStartedAt) {
        const startTime = new Date(votingStartedAt).getTime();
        const now = new Date().getTime();
        const timeElapsed = now - startTime;
        hoursElapsed = timeElapsed / (60 * 60 * 1000);
        isTimeout = hoursElapsed > 24;
      }
      
      // Controlla i voti
      const voteRecords = await base('votes').select({
        filterByFormula: `{matchId} = "${matchId}"`
      }).all();
      
      const uniqueVoters = new Set(voteRecords.map(vote => vote.get('fromPlayerId') as string));
      const votersFromMatch = allPlayers.filter(email => uniqueVoters.has(email));
      
      results.push({
        matchId,
        createdAt,
        votingStartedAt,
        hoursElapsed: Math.round(hoursElapsed * 10) / 10,
        isTimeout,
        totalPlayers: allPlayers.length,
        playersVoted: votersFromMatch.length,
        playersWhoVoted: Array.from(uniqueVoters),
        playersWhoHaventVoted: allPlayers.filter(email => !uniqueVoters.has(email)),
        teamA,
        teamB,
        status: isTimeout ? 'TIMEOUT_STUCK' : 'WAITING_VOTES'
      });
    }
    
    // Ordina per ore trascorse (i più bloccati prima)
    results.sort((a, b) => b.hoursElapsed - a.hoursElapsed);
    
    console.log(`🔍 DEBUG completato - ${results.length} partite analizzate`);
    
    return NextResponse.json({
      success: true,
      message: `Trovate ${results.length} partite con votazioni aperte`,
      stuckMatches: results.filter(r => r.isTimeout).length,
      waitingMatches: results.filter(r => !r.isTimeout).length,
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
        const finalizeResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/matches/${matchId}/finalize-voting`, {
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