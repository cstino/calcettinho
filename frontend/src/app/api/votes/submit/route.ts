import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurazione Airtable (usa le stesse credenziali)
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

    // Validazione: ogni voto deve essere 'UP' o 'DOWN'
    const invalidVotes = votes.filter(vote => vote.voteType !== 'UP' && vote.voteType !== 'DOWN');
    if (invalidVotes.length > 0) {
      console.log('Validazione fallita: voti non validi', invalidVotes);
      return NextResponse.json({ 
        success: false, 
        error: 'Voti non validi: ogni voto deve essere UP o DOWN' 
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

    console.log('✅ Validazione passata. Ricevuta richiesta di votazione UP/DOWN:', { voterEmail, matchId, votesCount: votes.length });

    // Prepara i record da inserire con la nuova struttura UP/DOWN
    const voteRecords = votes.map(vote => ({
      fields: {
        matchId: matchId,
        fromPlayerId: voterEmail, // Email del votante
        toPlayerId: vote.playerEmail, // Email del giocatore votato
        voteType: vote.voteType // 'UP' o 'DOWN'
      }
    }));

    console.log('✅ Records preparati per Airtable:', voteRecords.length, 'records');
    console.log('Primo record di esempio:', voteRecords[0]);

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
    
    console.log('✅ Voti UP/DOWN salvati con successo:', createdRecords.length);

    return NextResponse.json({ 
      success: true, 
      message: `${createdRecords.length} voti UP/DOWN salvati con successo per la partita ${matchId}`,
      votesSubmitted: createdRecords.length,
      matchId: matchId
    });
    
  } catch (error) {
    console.error('❌ ERRORE DETTAGLIATO nel salvare i voti UP/DOWN:');
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