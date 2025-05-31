import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

const baseId = process.env.AIRTABLE_BASE_ID;
const apiKey = process.env.AIRTABLE_API_KEY;

if (!baseId || !apiKey) {
  throw new Error('Variabili di ambiente Airtable mancanti');
}

Airtable.configure({
  apiKey: apiKey,
});

const base = Airtable.base(baseId);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);
    console.log(`Recupero premi per giocatore: ${decodedEmail}`);
    
    // Cerca tutti i premi per l'email specificata
    const records = await base('player_awards').select({
      filterByFormula: `{player_email} = "${decodedEmail}"`
    }).all();
    
    console.log(`Trovati ${records.length} premi per ${decodedEmail}`);
    
    const awards = records.map((record) => ({
      id: record.id,
      awardType: record.get('award_type') as string,
      matchId: record.get('match_id') as string,
      status: record.get('status') as string, // 'pending' o 'unlocked'
      unlockedAt: record.get('unlocked_at') as string,
      selected: record.get('selected') === true, // Se è la card selezionata come retro
      createdAt: record.get('Created time') as string
    }));
    
    // Separa per status
    const pendingAwards = awards.filter(award => award.status === 'pending');
    const unlockedAwards = awards.filter(award => award.status === 'unlocked');
    const selectedAward = awards.find(award => award.selected);
    
    const result = {
      total: awards.length,
      pending: pendingAwards.length,
      unlocked: unlockedAwards.length,
      awards: awards,
      pendingAwards,
      unlockedAwards,
      selectedCard: selectedAward || null
    };
    
    console.log(`Premi per ${decodedEmail}:`, result);
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Errore nel recupero premi giocatore:', error);
    
    // Fallback con collezione vuota in caso di errore
    return NextResponse.json({
      total: 0,
      pending: 0,
      unlocked: 0,
      awards: [],
      pendingAwards: [],
      unlockedAwards: [],
      selectedCard: null
    });
  }
}

// API per sbloccare un premio (da pending a unlocked)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);
    const { awardId } = await request.json();
    
    console.log(`Sbloccando premio ${awardId} per giocatore ${decodedEmail}`);
    
    // Trova il record del premio
    const records = await base('player_awards').select({
      filterByFormula: `AND({player_email} = "${decodedEmail}", RECORD_ID() = "${awardId}")`
    }).all();
    
    if (records.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Premio non trovato'
      }, { status: 404 });
    }
    
    const record = records[0];
    
    // Verifica che sia in stato pending
    if (record.get('status') !== 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Premio già sbloccato o in stato non valido'
      }, { status: 400 });
    }
    
    // Aggiorna lo status a unlocked
    await base('player_awards').update(record.id, {
      status: 'unlocked',
      unlocked_at: new Date().toISOString()
    });
    
    console.log(`Premio ${awardId} sbloccato con successo per ${decodedEmail}`);
    
    return NextResponse.json({
      success: true,
      message: 'Premio sbloccato con successo',
      awardId: awardId,
      awardType: record.get('award_type')
    });
    
  } catch (error) {
    console.error('Errore nello sblocco premio:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore interno del server'
    }, { status: 500 });
  }
}

// API per impostare la card selezionata come retro
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);
    const { awardId } = await request.json();
    
    console.log(`Impostando card selezionata ${awardId} per giocatore ${decodedEmail}`);
    
    // Prima rimuovi la selezione da tutte le altre card del giocatore
    const allRecords = await base('player_awards').select({
      filterByFormula: `{player_email} = "${decodedEmail}"`
    }).all();
    
    // Aggiorna tutti i record del giocatore per deselezionarli
    const updatePromises = allRecords.map(record => 
      base('player_awards').update(record.id, {
        selected: false
      })
    );
    
    await Promise.all(updatePromises);
    
    // Se awardId è null, significa deselezionare tutto (usa solo card base)
    if (awardId === null) {
      console.log(`Deselezionate tutte le card per ${decodedEmail}, verrà usata solo la card base`);
      return NextResponse.json({
        success: true,
        message: 'Card base selezionata come retro'
      });
    }
    
    // Trova il record specifico da selezionare
    const targetRecords = await base('player_awards').select({
      filterByFormula: `AND({player_email} = "${decodedEmail}", RECORD_ID() = "${awardId}")`
    }).all();
    
    if (targetRecords.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Premio non trovato'
      }, { status: 404 });
    }
    
    const targetRecord = targetRecords[0];
    
    // Verifica che sia sbloccato
    if (targetRecord.get('status') !== 'unlocked') {
      return NextResponse.json({
        success: false,
        error: 'Impossibile selezionare una card non sbloccata'
      }, { status: 400 });
    }
    
    // Seleziona la card target
    await base('player_awards').update(targetRecord.id, {
      selected: true
    });
    
    console.log(`Card ${awardId} selezionata come retro per ${decodedEmail}`);
    
    return NextResponse.json({
      success: true,
      message: 'Card selezionata come retro',
      selectedCard: {
        id: awardId,
        awardType: targetRecord.get('award_type')
      }
    });
    
  } catch (error) {
    console.error('Errore nella selezione card:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore interno del server'
    }, { status: 500 });
  }
} 