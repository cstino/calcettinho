const Airtable = require('airtable');

// Import fetch per compatibilità Node.js
let fetch;
try {
  fetch = globalThis.fetch;
} catch {
  fetch = require('node-fetch');
}

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
    const { matchId } = JSON.parse(event.body);
    
    if (!matchId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'matchId richiesto'
        })
      };
    }
    
    console.log('🔧 FORCE FINALIZE: Finalizzazione forzata per partita:', matchId);
    
    // Configurazione Airtable
    const airtable = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    });

    const base = airtable.base(process.env.AIRTABLE_BASE_ID);

    // 1. Verifica che la partita esista ed è completata
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
    if (!match.get('completed')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'La partita deve essere completata prima di essere finalizzata'
        })
      };
    }

    // 2. Chiama finalize-voting con forzatura
    console.log('🔧 Chiamando finalize-voting con forzatura...');
    
    try {
      // Costruisci URL per finalize-voting - usa URL assoluto
      const baseUrl = event.headers.host ? `https://${event.headers.host}` : 'https://calcettinho.netlify.app';
      const finalizeUrl = `${baseUrl}/.netlify/functions/finalize-voting?matchId=${matchId}`;
      
      console.log('🔧 Chiamando URL:', finalizeUrl);
      
      const finalizeResponse = await fetch(finalizeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          force: true
        })
      });

      const finalizeData = await finalizeResponse.json();
      
      if (finalizeData.success) {
        console.log('✅ Finalize-voting completato con successo');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Partita finalizzata forzatamente con successo',
            matchId,
            motmAwarded: finalizeData.motmAwards || 0,
            abilitiesUpdated: finalizeData.playerAbilitiesUpdated || 0,
            motmDetails: finalizeData.motmDetails || [],
            statUpdates: finalizeData.statUpdates || [],
            voteStats: finalizeData.voteStats || {},
            details: finalizeData
          })
        };
      } else {
        console.log('❌ Errore in finalize-voting:', finalizeData.error);
        
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Errore nella finalizzazione forzata',
            details: finalizeData.error,
            matchId
          })
        };
      }
    } catch (finalizeError) {
      console.error('❌ Errore durante chiamata finalize-voting:', finalizeError);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Errore durante finalizzazione forzata',
          details: finalizeError.message || 'Errore sconosciuto'
        })
      };
    }

  } catch (error) {
    console.error('❌ FORCE FINALIZE: Errore durante finalizzazione forzata:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Errore durante finalizzazione forzata',
        details: error.message || 'Errore sconosciuto'
      })
    };
  }
}; 