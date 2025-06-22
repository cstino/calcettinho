import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configura Airtable
const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
});

const base = airtable.base(process.env.AIRTABLE_BASE_ID!);
const matchesTable = base('matches'); // Nome della tabella in Airtable

export async function GET() {
  try {
    console.log('=== RECUPERO PARTITE ===');
    
    const records = await matchesTable.select({
      sort: [{ field: 'date', direction: 'desc' }]
    }).all();
    console.log(`Record trovati: ${records.length}`);

    const matches = records.map((record) => {
      console.log(`Record ID: ${record.id}`);
      console.log('Campi del record:', record.fields);
      
      // Parse player stats se disponibili
      let playerStats = {};
      try {
        if (record.get('playerStats')) {
          playerStats = JSON.parse(record.get('playerStats') as string);
        }
      } catch (e) {
        console.log('Errore nel parsing playerStats:', e);
        playerStats = {};
      }

      return {
      id: record.id,
      matchId: record.get('IDmatch') || record.id,
      date: record.get('date') || '',
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
      teamAScorer: record.get('teamAscorer') || record.get('teamAScorer') || '',
      teamBScorer: record.get('teamBscorer') || record.get('teamBScorer') || '',
      assistA: record.get('AssistA') || '',
      assistB: record.get('AssistB') || '',
      completed: record.get('completed') === true || record.get('completed') === 'true',
      referee: record.get('referee') || '',
      match_status: record.get('match_status') || 'scheduled',
      playerStats: playerStats, // Aggiungi le statistiche dei giocatori
      // Determina lo stato basandosi su match_status se disponibile, altrimenti su completed
      status: record.get('match_status') || (record.get('completed') === true || record.get('completed') === 'true' 
        ? 'completed' 
        : 'scheduled')
    };
    });
    
    console.log('Partite processate e ordinate:', matches.length);

    const response = NextResponse.json(matches);
    
    // Aggiungi header CORS
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('Errore nel recupero delle partite:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle partite' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREAZIONE PARTITA ===');
    const body = await request.json();
    console.log('Body ricevuto:', body);
    
    const { date, teamA, teamB, referee } = body;

    // Validazione dati
    if (!date || !teamA || !teamB) {
      console.log('Validazione fallita: dati mancanti');
      return NextResponse.json(
        { error: 'Dati mancanti: data, teamA e teamB sono obbligatori' },
        { status: 400 }
      );
    }

    if (!Array.isArray(teamA) || !Array.isArray(teamB)) {
      console.log('Validazione fallita: team non sono array');
      return NextResponse.json(
        { error: 'teamA e teamB devono essere array di email' },
        { status: 400 }
      );
    }

    if (teamA.length === 0 || teamB.length === 0) {
      console.log('Validazione fallita: squadre vuote');
      return NextResponse.json(
        { error: 'Ogni squadra deve avere almeno un giocatore' },
        { status: 400 }
      );
    }

    // Genera un ID unico per la partita
    const matchId = `match_${Date.now()}`;
    console.log('ID partita generato:', matchId);

    // Verifica credenziali Airtable
    console.log('API Key presente:', !!process.env.AIRTABLE_API_KEY);
    console.log('Base ID presente:', !!process.env.AIRTABLE_BASE_ID);

    // Crea il record in Airtable
    console.log('Tentativo di creazione record in Airtable...');
    const record = await matchesTable.create({
      IDmatch: matchId,
      date: date,
      teamA: JSON.stringify(teamA),
      teamB: JSON.stringify(teamB),
      completed: false,
      match_status: 'scheduled',
      referee: referee || ''
    });
    console.log('Record creato con successo in Airtable:', (record as any).id);

    const newMatch = {
      id: (record as any).id,
      matchId: matchId,
      date: date,
      teamA: teamA,
      teamB: teamB,
      completed: false,
      match_status: 'scheduled' as const,
      referee: referee || ''
    };

    console.log('Partita creata:', newMatch);
    return NextResponse.json({
      success: true,
      match: newMatch
    });

  } catch (error) {
    console.error('Errore generale nella creazione della partita:', error);
    return NextResponse.json(
      { error: `Errore nella creazione della partita: ${error instanceof Error ? error.message : 'Errore sconosciuto'}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('=== AGGIORNAMENTO PARTITA ===');
    const body = await request.json();
    console.log('Body ricevuto:', body);
    
    const { 
      matchId, 
      scoreA, 
      scoreB, 
      teamAScorer, 
      teamBScorer, 
      assistA, 
      assistB, 
      playerStats,
      completed,
      match_status,
      referee
    } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: 'ID partita mancante' },
        { status: 400 }
      );
    }

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
    if (scoreA !== undefined) updateData.scoreA = scoreA;
    if (scoreB !== undefined) updateData.scoreB = scoreB;
    if (teamAScorer !== undefined) updateData.teamAscorer = teamAScorer;
    if (teamBScorer !== undefined) updateData.teamBscorer = teamBScorer;
    if (assistA !== undefined) updateData.AssistA = assistA;
    if (assistB !== undefined) updateData.AssistB = assistB;
    if (playerStats !== undefined) updateData.playerStats = JSON.stringify(playerStats);
    if (completed !== undefined) updateData.completed = completed;
    if (match_status !== undefined) updateData.match_status = match_status;
    if (referee !== undefined) updateData.referee = referee;

    console.log('Dati da aggiornare:', updateData);

    // Aggiorna il record in Airtable
    const updatedRecord = await matchesTable.update(record.id, updateData);
    console.log('Record aggiornato con successo');

    // Parse delle statistiche dei giocatori per la risposta
    let parsedPlayerStats = {};
    try {
      if (updatedRecord.get('playerStats')) {
        parsedPlayerStats = JSON.parse(updatedRecord.get('playerStats') as string);
      }
    } catch (e) {
      console.log('Errore nel parsing playerStats nella risposta:', e);
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
      scoreA: updatedRecord.get('scoreA') ? Number(updatedRecord.get('scoreA')) : undefined,
      scoreB: updatedRecord.get('scoreB') ? Number(updatedRecord.get('scoreB')) : undefined,
      teamAScorer: updatedRecord.get('teamAscorer') || '',
      teamBScorer: updatedRecord.get('teamBscorer') || '',
      assistA: updatedRecord.get('AssistA') || '',
      assistB: updatedRecord.get('AssistB') || '',
      playerStats: parsedPlayerStats,
      completed: updatedRecord.get('completed') === true,
      location: updatedRecord.get('location') || 'Campo Centrale',
      referee: updatedRecord.get('referee') || '',
      match_status: updatedRecord.get('match_status') || 'scheduled',
      status: updatedRecord.get('match_status') || (updatedRecord.get('completed') === true ? 'completed' : 'scheduled')
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