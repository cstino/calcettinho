import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configura Airtable
const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
});

const base = airtable.base(process.env.AIRTABLE_BASE_ID!);
const matchesTable = base('matches');

// POST - Avvia una partita (cambia status da scheduled a in_progress)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id;
    console.log('=== AVVIO PARTITA ===', matchId);

    // Trova il record in Airtable
    const records = await matchesTable.select({
      filterByFormula: `{IDmatch} = '${matchId}'`
    }).all();

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'Partita non trovata' },
        { status: 404 }
      );
    }

    const record = records[0];
    
    // Verifica che la partita sia in stato scheduled o undefined (per retrocompatibilità)
    const currentStatus = record.get('match_status');
    const isCompleted = record.get('completed');
    
    // Se la partita è già completata, non può essere avviata
    if (isCompleted === true) {
      return NextResponse.json(
        { error: `Impossibile avviare la partita. La partita è già completata.` },
        { status: 400 }
      );
    }
    
    // Se lo status è già in_progress, non può essere riavviata
    if (currentStatus === 'in_progress') {
      return NextResponse.json(
        { error: `La partita è già in corso.` },
        { status: 400 }
      );
    }
    
    // Permetti l'avvio se lo status è 'scheduled' o undefined (retrocompatibilità)
    if (currentStatus && currentStatus !== 'scheduled') {
      return NextResponse.json(
        { error: `Impossibile avviare la partita. Status attuale: ${currentStatus}` },
        { status: 400 }
      );
    }

    // Aggiorna lo status a in_progress
    const updatedRecord = await matchesTable.update(record.id, {
      match_status: 'in_progress'
    });

    console.log('Partita avviata con successo');

    // Parse player stats se disponibili
    let playerStats = {};
    try {
      if (updatedRecord.get('playerStats')) {
        playerStats = JSON.parse(updatedRecord.get('playerStats') as string);
      }
    } catch (e) {
      console.log('Errore nel parsing playerStats:', e);
      playerStats = {};
    }

    // Restituisci i dati aggiornati
    const updatedMatch = {
      id: updatedRecord.id,
      matchId: updatedRecord.get('IDmatch'),
      date: updatedRecord.get('date'),
      teamA: Array.isArray(updatedRecord.get('teamA')) 
        ? updatedRecord.get('teamA') as string[]
        : (typeof updatedRecord.get('teamA') === 'string' && updatedRecord.get('teamA') 
          ? JSON.parse(updatedRecord.get('teamA') as string) 
          : []),
      teamB: Array.isArray(updatedRecord.get('teamB')) 
        ? updatedRecord.get('teamB') as string[]
        : (typeof updatedRecord.get('teamB') === 'string' && updatedRecord.get('teamB') 
          ? JSON.parse(updatedRecord.get('teamB') as string) 
          : []),
      scoreA: updatedRecord.get('scoreA') ? Number(updatedRecord.get('scoreA')) : 0,
      scoreB: updatedRecord.get('scoreB') ? Number(updatedRecord.get('scoreB')) : 0,
      teamAScorer: updatedRecord.get('teamAscorer') || '',
      teamBScorer: updatedRecord.get('teamBscorer') || '',
      assistA: updatedRecord.get('AssistA') || '',
      assistB: updatedRecord.get('AssistB') || '',
      playerStats: playerStats,
      completed: updatedRecord.get('completed') === true,
      location: updatedRecord.get('location') || 'Campo Centrale',
      referee: updatedRecord.get('referee') || '',
      match_status: updatedRecord.get('match_status'),
      status: updatedRecord.get('match_status')
    };

    return NextResponse.json({
      success: true,
      message: 'Partita avviata con successo',
      match: updatedMatch
    });

  } catch (error) {
    console.error('Errore nell\'avvio della partita:', error);
    return NextResponse.json(
      { error: `Errore nell'avvio della partita: ${error instanceof Error ? error.message : 'Errore sconosciuto'}` },
      { status: 500 }
    );
  }
} 