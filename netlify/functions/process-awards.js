const Airtable = require('airtable');

exports.handler = async (event, context) => {
  // Gestione CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (event.httpMethod !== 'POST') {
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
    
    console.log('🏁 PROCESS AWARDS: DEPRECATO - Le statistiche vengono processate da finalize-voting');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '⚠️ Endpoint deprecato: Le statistiche vengono processate automaticamente al termine delle votazioni tramite finalize-voting',
        matchId,
        awards: 0,
        isReprocessing: false,
        awardDetails: [],
        note: 'Le statistiche e i premi vengono calcolati con l\'algoritmo fair SOLO dopo la chiusura delle votazioni (tutti votano OR 24h passate) oppure con finalizzazione forzata dall\'admin.'
      })
    };

  } catch (error) {
    console.error('❌ PROCESS AWARDS: Errore nel processamento:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Errore nel processamento premi e statistiche',
        details: error.message || 'Errore sconosciuto'
      })
    };
  }
}; 