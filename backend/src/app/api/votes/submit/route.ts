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

    console.log('Ricevuta richiesta di votazione:', { voterEmail, matchId, votesCount: votes.length });

    // Usa il matchId fornito dal frontend
    const finalMatchId = matchId;

    // Prepara i record da inserire usando la struttura corretta
    const voteRecords = votes.map(vote => ({
      fields: {
        matchId: finalMatchId,
        fromPlayerId: voterEmail, // Email del votante
        toPlayerId: vote.playerEmail, // Email del giocatore votato
        value: vote.rating // Voto da 1 a 10
      }
    }));

    console.log('Records da inserire:', voteRecords);

    // Inserisce i voti nella tabella "votes" di Airtable
    const createdRecords = await base('votes').create(voteRecords);
    
    console.log('Voti salvati con successo:', createdRecords.length);

    return NextResponse.json({ 
      success: true, 
      message: `${createdRecords.length} voti salvati con successo per la partita ${finalMatchId}`,
      votesSubmitted: createdRecords.length,
      matchId: finalMatchId
    });
    
  } catch (error) {
    console.error('Errore nel salvare i voti:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 