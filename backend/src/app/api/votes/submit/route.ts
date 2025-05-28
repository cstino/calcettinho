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
    const { voterEmail, matchId, votes } = await req.json();
    
    if (!voterEmail || !matchId || !votes || !Array.isArray(votes) || votes.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dati di votazione mancanti o non validi (voterEmail, matchId, votes richiesti)' 
      }, { status: 400 });
    }

    // Validazione: ogni voto deve essere 'UP' o 'DOWN'
    const invalidVotes = votes.filter(vote => vote.voteType !== 'UP' && vote.voteType !== 'DOWN');
    if (invalidVotes.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Voti non validi: ogni voto deve essere UP o DOWN' 
      }, { status: 400 });
    }

    // Validazione: deve esserci esattamente 9 voti (non può votare se stesso)
    if (votes.length !== 9) {
      return NextResponse.json({ 
        success: false, 
        error: 'Devono esserci esattamente 9 voti (tutti i giocatori tranne il votante)' 
      }, { status: 400 });
    }

    console.log('Ricevuta richiesta di votazione UP/DOWN:', { voterEmail, matchId, votesCount: votes.length });

    // Prepara i record da inserire con la nuova struttura UP/DOWN
    const voteRecords = votes.map(vote => ({
      fields: {
        matchId: matchId,
        fromPlayerId: voterEmail, // Email del votante
        toPlayerId: vote.playerEmail, // Email del giocatore votato
        voteType: vote.voteType // 'UP' o 'DOWN'
      }
    }));

    console.log('Records UP/DOWN da inserire:', voteRecords);

    // Inserisce i voti nella tabella "votes" di Airtable
    const createdRecords = await base('votes').create(voteRecords);
    
    console.log('Voti UP/DOWN salvati con successo:', createdRecords.length);

    return NextResponse.json({ 
      success: true, 
      message: `${createdRecords.length} voti UP/DOWN salvati con successo per la partita ${matchId}`,
      votesSubmitted: createdRecords.length,
      matchId: matchId
    });
    
  } catch (error) {
    console.error('Errore nel salvare i voti UP/DOWN:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 