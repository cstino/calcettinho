import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configura Airtable
const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
});

const base = airtable.base(process.env.AIRTABLE_BASE_ID!);
const matchesTable = base('matches');

// Funzione helper per aggiornare le statistiche dei giocatori
async function updatePlayerStats(matchRecord: any, playerStats: any, scoreA: number, scoreB: number) {
  const playersTable = base('players');
  
  // Ottieni i team dalla partita
  const teamA = Array.isArray(matchRecord.get('teamA')) 
    ? matchRecord.get('teamA')
    : JSON.parse(matchRecord.get('teamA') || '[]');
  const teamB = Array.isArray(matchRecord.get('teamB')) 
    ? matchRecord.get('teamB')
    : JSON.parse(matchRecord.get('teamB') || '[]');
  
  // Determina chi ha vinto
  const teamAWon = scoreA > scoreB;
  const teamBWon = scoreB > scoreA;
  const isDraw = scoreA === scoreB;
  
  console.log(`Risultato: Team A ${scoreA} - ${scoreB} Team B`);
  console.log(`Vincitore: ${teamAWon ? 'Team A' : teamBWon ? 'Team B' : 'Pareggio'}`);
  
  // Aggiorna statistiche per tutti i giocatori
  const allPlayers = [...teamA, ...teamB];
  
  for (const playerEmail of allPlayers) {
    try {
      console.log(`Aggiornamento statistiche per: ${playerEmail}`);
      
      // Trova il giocatore
      const playerRecords = await playersTable.select({
        filterByFormula: `{email} = '${playerEmail}'`
      }).all();
      
      if (playerRecords.length === 0) {
        console.log(`Giocatore non trovato: ${playerEmail}`);
        continue;
      }
      
      const playerRecord = playerRecords[0];
      const currentStats = playerRecord.fields;
      
      // Statistiche attuali (con default 0)
      const partiteGiocate = (currentStats.partiteGiocate || 0) + 1;
      let partiteVinte = currentStats.partiteVinte || 0;
      let partitePerse = currentStats.partitePerse || 0;
      let partitePareggiate = currentStats.partitePareggiate || 0;
      
      // Aggiorna vittorie/sconfitte/pareggi
      const isInTeamA = teamA.includes(playerEmail);
      if (isDraw) {
        partitePareggiate += 1;
      } else if ((isInTeamA && teamAWon) || (!isInTeamA && teamBWon)) {
        partiteVinte += 1;
      } else {
        partitePerse += 1;
      }
      
      // Statistiche di gioco dalla partita
      const playerMatchStats = playerStats[playerEmail] || {};
      const golFatti = (currentStats.golFatti || 0) + (playerMatchStats.gol || 0);
      const assistFatti = (currentStats.assistFatti || 0) + (playerMatchStats.assist || 0);
      const cartelliGialli = (currentStats.cartelliGialli || 0) + (playerMatchStats.gialli || 0);
      const cartelliRossi = (currentStats.cartelliRossi || 0) + (playerMatchStats.rossi || 0);
      
      // Aggiorna il record del giocatore
      const updateData = {
        partiteGiocate,
        partiteVinte,
        partitePerse,
        partitePareggiate,
        golFatti,
        assistFatti,
        cartelliGialli,
        cartelliRossi
      };
      
      console.log(`Aggiornamento dati per ${playerEmail}:`, updateData);
      
      await playersTable.update(playerRecord.id, updateData);
      console.log(`Statistiche aggiornate per: ${playerEmail}`);
      
    } catch (playerError) {
      console.error(`Errore aggiornamento ${playerEmail}:`, playerError);
      // Continua con gli altri giocatori
    }
  }
}

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
      playerStats: playerStats,
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
    if (body.playerStats !== undefined) updateData.playerStats = JSON.stringify(body.playerStats);
    if (body.completed !== undefined) updateData.completed = body.completed;
    if (body.location !== undefined) updateData.location = body.location;

    console.log('Dati da aggiornare:', updateData);

    // Aggiorna il record in Airtable
    const updatedRecord = await matchesTable.update(record.id, updateData);
    console.log('Record aggiornato con successo');

    // Se la partita è stata completata, aggiorna le statistiche dei giocatori
    if (body.completed && body.playerStats && body.scoreA !== undefined && body.scoreB !== undefined) {
      console.log('=== AGGIORNAMENTO STATISTICHE GIOCATORI ===');
      try {
        await updatePlayerStats(updatedRecord, body.playerStats, body.scoreA, body.scoreB);
        console.log('Statistiche giocatori aggiornate con successo');
      } catch (statsError) {
        console.error('Errore nell\'aggiornamento statistiche:', statsError);
        // Non blocchiamo la risposta per errori nelle statistiche
      }
    }

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