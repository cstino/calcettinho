import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurazione Airtable
const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
});

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('Missing Airtable configuration in environment variables');
}

const base = Airtable.base(baseId);

export async function POST(req: NextRequest) {
  try {
    console.log('=== INIZIO SUBMISSION VOTI ===');
    
    const { voterEmail, matchId, votes } = await req.json();
    console.log('Dati ricevuti:', { voterEmail, matchId, votesCount: votes?.length });
    
    if (!voterEmail || !matchId || !votes || !Array.isArray(votes) || votes.length === 0) {
      console.log('Validazione fallita: dati mancanti');
      return NextResponse.json({ 
        success: false, 
        error: 'Dati di votazione mancanti o non validi (voterEmail, matchId, votes richiesti)' 
      }, { status: 400 });
    }

    // ✅ CONTROLLO VOTI DUPLICATI - Verifica se l'utente ha già votato
    console.log('🔍 Controllo voti esistenti per:', { voterEmail, matchId });
    
    try {
      const existingVotes = await base('votes')
        .select({
          filterByFormula: `AND(
            {fromPlayerId} = '${voterEmail}',
            {matchId} = '${matchId}'
          )`,
          maxRecords: 1
        })
        .firstPage();

      if (existingVotes.length > 0) {
        console.log('❌ Voti già esistenti trovati:', existingVotes.length);
        return NextResponse.json({ 
          success: false, 
          error: 'Hai già votato per questa partita!',
          code: 'ALREADY_VOTED'
        }, { status: 409 }); // 409 Conflict
      }
      
      console.log('✅ Nessun voto esistente trovato, procedo con l\'inserimento');
    } catch (checkError) {
      console.error('❌ Errore nel controllo voti esistenti:', checkError);
      return NextResponse.json({ 
        success: false, 
        error: 'Errore nel controllo voti esistenti'
      }, { status: 500 });
    }

    // ✅ NUOVO: Validazione aggiornata per includere NEUTRAL e MOTM
    const invalidVotes = votes.filter(vote => 
      !['UP', 'DOWN', 'NEUTRAL'].includes(vote.voteType) ||
      typeof vote.motmVote !== 'boolean'
    );
    if (invalidVotes.length > 0) {
      console.log('Validazione fallita: voti non validi', invalidVotes);
      return NextResponse.json({ 
        success: false, 
        error: 'Voti non validi: ogni voto deve essere UP, DOWN o NEUTRAL con motmVote boolean' 
      }, { status: 400 });
    }

    // Validazione: deve esserci almeno 1 voto
    if (votes.length < 1) {
      console.log('Validazione fallita: nessun voto');
      return NextResponse.json({ 
        success: false, 
        error: 'Deve esserci almeno 1 voto' 
      }, { status: 400 });
    }

    console.log('✅ Validazione passata. Ricevuta richiesta di votazione con NEUTRAL e MOTM:', { 
      voterEmail, 
      matchId, 
      votesCount: votes.length,
      motmVotes: votes.filter(v => v.motmVote).length
    });

    // ✅ NUOVO: Prepara i record con il nuovo formato che include motm_vote
    const voteRecords = votes.map(vote => ({
      fields: {
        matchId: matchId,
        fromPlayerId: voterEmail, // Email del votante
        toPlayerId: vote.playerEmail, // Email del giocatore votato
        voteType: vote.voteType, // 'UP', 'DOWN' o 'NEUTRAL'
        motm_vote: vote.motmVote // true/false per il voto MOTM
      }
    }));

    console.log('✅ Records preparati per Airtable:', voteRecords.length, 'records');
    console.log('Primo record di esempio:', voteRecords[0]);
    console.log('MOTM votes trovati:', voteRecords.filter(r => r.fields.motm_vote).length);

    // Test credenziali Airtable
    console.log('🔑 Controllo credenziali Airtable...');
    console.log('API Key presente:', !!apiKey);
    console.log('Base ID presente:', !!baseId);
    
    if (!apiKey || !baseId) {
      throw new Error('Credenziali Airtable mancanti nel .env');
    }

    // Inserisce i voti nella tabella "votes" di Airtable
    console.log('📤 Tentativo inserimento in Airtable...');
    const createdRecords = await base('votes').create(voteRecords);
    
    console.log('✅ Voti con NEUTRAL e MOTM salvati con successo:', createdRecords.length);

    // ✅ NUOVO: Statistiche dettagliate per il log
    const stats = {
      total: createdRecords.length,
      upVotes: votes.filter(v => v.voteType === 'UP').length,
      downVotes: votes.filter(v => v.voteType === 'DOWN').length,
      neutralVotes: votes.filter(v => v.voteType === 'NEUTRAL').length,
      motmVotes: votes.filter(v => v.motmVote).length
    };

    console.log('📊 Statistiche voti salvati:', stats);

    return NextResponse.json({ 
      success: true, 
      message: `${createdRecords.length} voti salvati con successo per la partita ${matchId}`,
      votesSubmitted: createdRecords.length,
      matchId: matchId,
      stats: stats
    });
    
  } catch (error) {
    console.error('❌ ERRORE DETTAGLIATO nel salvare i voti:');
    console.error('Tipo errore:', typeof error);
    console.error('Nome errore:', error instanceof Error ? error.name : 'N/A');
    console.error('Messaggio errore:', error instanceof Error ? error.message : 'N/A');
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
    console.error('Errore completo:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Errore sconosciuto',
      errorType: error instanceof Error ? error.name : typeof error
    }, { status: 500 });
  }
} 