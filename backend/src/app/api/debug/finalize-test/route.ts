import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurazione Airtable
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');
    
    if (!matchId) {
      return NextResponse.json({
        success: false,
        error: 'matchId richiesto come query parameter'
      }, { status: 400 });
    }

    console.log(`🔍 DEBUG: Testando aggiornamento campo finalized per partita ${matchId}`);

    // 1. Recupera i dettagli della partita
    const matchRecords = await base('matches').select({
      filterByFormula: `{IDmatch} = "${matchId}"`
    }).all();

    if (matchRecords.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Partita non trovata'
      }, { status: 404 });
    }

    const match = matchRecords[0];
    
    // 2. Mostra lo stato attuale
    const currentState = {
      id: match.id,
      IDmatch: match.get('IDmatch'),
      voting_status: match.get('voting_status'),
      finalized: match.get('finalized'),
      voting_closed_at: match.get('voting_closed_at'),
      voting_close_reason: match.get('voting_close_reason')
    };
    
    console.log('📋 Stato attuale partita:', currentState);

    // 3. Tenta aggiornamento
    try {
      await base('matches').update(match.id, {
        finalized: true,
        last_debug_test: new Date().toISOString()
      });
      console.log('✅ Aggiornamento campo finalized riuscito');
      
      // 4. Rileggi per verificare
      const updatedMatchRecords = await base('matches').select({
        filterByFormula: `{IDmatch} = "${matchId}"`
      }).all();
      
      const updatedMatch = updatedMatchRecords[0];
      const updatedState = {
        id: updatedMatch.id,
        IDmatch: updatedMatch.get('IDmatch'),
        voting_status: updatedMatch.get('voting_status'),
        finalized: updatedMatch.get('finalized'),
        voting_closed_at: updatedMatch.get('voting_closed_at'),
        voting_close_reason: updatedMatch.get('voting_close_reason'),
        last_debug_test: updatedMatch.get('last_debug_test')
      };
      
      return NextResponse.json({
        success: true,
        message: 'Test aggiornamento campo finalized completato',
        before: currentState,
        after: updatedState,
        updated: currentState.finalized !== updatedState.finalized
      });
      
    } catch (updateError) {
      console.error('❌ Errore nell\'aggiornamento campo finalized:', updateError);
      
      return NextResponse.json({
        success: false,
        error: 'Errore nell\'aggiornamento',
        details: updateError instanceof Error ? updateError.message : 'Errore sconosciuto',
        currentState: currentState
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Errore nel debug finalize-test:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel test',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}