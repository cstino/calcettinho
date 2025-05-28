import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configura Airtable
const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
});

const base = airtable.base(process.env.AIRTABLE_BASE_ID!);
const matchesTable = base('matches');

// GET - Ottieni una singola partita
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id;
    console.log('=== GET SINGOLA PARTITA ===', matchId);

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
    const match = {
      id: record.id,
      matchId: record.get('IDmatch'),
      date: record.get('date'),
      teamA: Array.isArray(record.get('teamA')) 
        ? record.get('teamA') as string[]
        : (typeof record.get('teamA') === 'string' && record.get('teamA') 
          ? JSON.parse(record.get('teamA') as string) 
          : []),
      teamB: Array.isArray(record.get('teamB')) 
        ? record.get('teamB') as string[]
        : (typeof record.get('teamB') === 'string' && record.get('teamB') 
          ? JSON.parse(record.get('teamB') as string) 
          : []),
      scoreA: record.get('scoreA') ? Number(record.get('scoreA')) : undefined,
      scoreB: record.get('scoreB') ? Number(record.get('scoreB')) : undefined,
      teamAScorer: record.get('teamAscorer') || '',
      teamBScorer: record.get('teamBscorer') || '',
      assistA: record.get('AssistA') || '',
      assistB: record.get('AssistB') || '',
      completed: record.get('completed') === true,
      location: record.get('location') || 'Campo Centrale',
      status: record.get('completed') === true ? 'completed' : 'scheduled'
    };

    return NextResponse.json(match);

  } catch (error) {
    console.error('Errore nel recupero della partita:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero della partita' },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna una partita
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id;
    const body = await request.json();
    console.log('=== AGGIORNAMENTO PARTITA ===', matchId, body);

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
    
    // Prepara i dati da aggiornare
    const updateData: any = {};
    
    if (body.date !== undefined) updateData.date = body.date;
    if (body.teamA !== undefined) updateData.teamA = JSON.stringify(body.teamA);
    if (body.teamB !== undefined) updateData.teamB = JSON.stringify(body.teamB);
    if (body.scoreA !== undefined) updateData.scoreA = body.scoreA;
    if (body.scoreB !== undefined) updateData.scoreB = body.scoreB;
    if (body.teamAScorer !== undefined) updateData.teamAscorer = body.teamAScorer;
    if (body.teamBScorer !== undefined) updateData.teamBscorer = body.teamBScorer;
    if (body.assistA !== undefined) updateData.AssistA = body.assistA;
    if (body.assistB !== undefined) updateData.AssistB = body.assistB;
    if (body.completed !== undefined) updateData.completed = body.completed;
    if (body.location !== undefined) updateData.location = body.location;

    console.log('Dati da aggiornare:', updateData);

    // Aggiorna il record in Airtable
    const updatedRecord = await matchesTable.update(record.id, updateData);
    console.log('Record aggiornato con successo');

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
      scoreA: updatedRecord.get('scoreA') ? Number(updatedRecord.get('scoreA')) : undefined,
      scoreB: updatedRecord.get('scoreB') ? Number(updatedRecord.get('scoreB')) : undefined,
      teamAScorer: updatedRecord.get('teamAscorer') || '',
      teamBScorer: updatedRecord.get('teamBscorer') || '',
      assistA: updatedRecord.get('AssistA') || '',
      assistB: updatedRecord.get('AssistB') || '',
      completed: updatedRecord.get('completed') === true,
      location: updatedRecord.get('location') || 'Campo Centrale',
      status: updatedRecord.get('completed') === true ? 'completed' : 'scheduled'
    };

    return NextResponse.json({
      success: true,
      match: updatedMatch
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento della partita:', error);
    return NextResponse.json(
      { error: `Errore nell'aggiornamento della partita: ${error instanceof Error ? error.message : 'Errore sconosciuto'}` },
      { status: 500 }
    );
  }
}

// DELETE - Elimina una partita
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id;
    console.log('=== ELIMINAZIONE PARTITA ===', matchId);

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
    
    // Elimina il record da Airtable
    await matchesTable.destroy(record.id);
    console.log('Record eliminato con successo');

    return NextResponse.json({
      success: true,
      message: 'Partita eliminata con successo'
    });

  } catch (error) {
    console.error('Errore nell\'eliminazione della partita:', error);
    return NextResponse.json(
      { error: `Errore nell'eliminazione della partita: ${error instanceof Error ? error.message : 'Errore sconosciuto'}` },
      { status: 500 }
    );
  }
} 