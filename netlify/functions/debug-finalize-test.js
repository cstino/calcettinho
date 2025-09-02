const Airtable = require('airtable');

exports.handler = async (event, context) => {
  // Gestione CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Gestione preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non supportato' })
    };
  }

  try {
    // Ottieni matchId dai query parameters
    const url = new URL(event.rawUrl || `https://example.com${event.path}?${event.rawQuery || ''}`);
    const matchId = url.searchParams.get('matchId');
    
    if (!matchId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'matchId richiesto come query parameter'
        })
      };
    }
    
    console.log(`🔍 DEBUG: Testando aggiornamento campo finalized per partita ${matchId}`);
    
    // Configurazione Airtable
    const airtable = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    });

    const base = airtable.base(process.env.AIRTABLE_BASE_ID);

    // 1. Recupera i dettagli della partita
    const matchRecords = await base('matches').select({
      filterByFormula: `{IDmatch} = "${matchId}"`
    }).all();

    if (matchRecords.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Partita non trovata'
        })
      };
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
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Test aggiornamento campo finalized completato',
          before: currentState,
          after: updatedState,
          updated: currentState.finalized !== updatedState.finalized
        })
      };
      
    } catch (updateError) {
      console.error('❌ Errore nell\'aggiornamento campo finalized:', updateError);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Errore nell\'aggiornamento',
          details: updateError.message || 'Errore sconosciuto',
          currentState: currentState
        })
      };
    }

  } catch (error) {
    console.error('❌ Errore nel debug finalize-test:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Errore nel test',
        details: error.message || 'Errore sconosciuto'
      })
    };
  }
};