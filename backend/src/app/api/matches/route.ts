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
    console.log('=== GET PARTITE ===');
    const records = await matchesTable.select({}).all();
    console.log(`Trovati ${records.length} record in Airtable`);
    
    const matches = records.map((record) => {
      console.log(`Record ID: ${record.id}`);
      console.log(`Date raw:`, record.get('date'));
      console.log(`TeamA raw:`, record.get('teamA'));
      console.log(`TeamB raw:`, record.get('teamB'));
      
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
      location: record.get('location') || 'Campo Centrale',
      // Determina lo stato basandosi su completed e presenza di scores
      status: record.get('completed') === true || record.get('completed') === 'true' 
        ? 'completed' 
        : 'scheduled'
    };
    });
    
    console.log('Partite processate:', matches.length);

    return NextResponse.json(matches);
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
    
    const { date, teamA, teamB, location } = body;

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

    try {
      // Crea il record in Airtable
      console.log('Tentativo di creazione record in Airtable...');
      const record = await matchesTable.create({
        IDmatch: matchId,
        date: date,
        teamA: teamA,
        teamB: teamB,
        completed: false,
        ...(location && { location: location })
      });
      console.log('Record creato con successo in Airtable');
    } catch (airtableError) {
      console.error('Errore Airtable:', airtableError);
      // Per ora restituiamo successo anche senza Airtable per testare
      console.log('Continuando senza Airtable per test...');
    }

    const newMatch = {
      id: matchId,
      matchId: matchId,
      date: date,
      teamA: teamA,
      teamB: teamB,
      completed: false,
      status: 'scheduled' as const,
      location: location || 'Campo Centrale'
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