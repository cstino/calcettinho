const Airtable = require('airtable');

exports.handler = async (event, context) => {
  // Gestione CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  // Solo GET è supportato per questa API
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // Estrai i parametri dal path
    // URL: /api/votes/check/voter@email.com/match123
    const pathSegments = event.path.split('/');
    
    // Trova l'indice di "check" e prendi i due parametri dopo
    const checkIndex = pathSegments.indexOf('check');
    if (checkIndex === -1 || pathSegments.length < checkIndex + 3) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Parametri mancanti nel path' })
      };
    }

    const voterEmailEncoded = pathSegments[checkIndex + 1];
    const matchIdEncoded = pathSegments[checkIndex + 2];
    
    if (!voterEmailEncoded || !matchIdEncoded) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'VoterEmail o matchId mancanti nel path' })
      };
    }

    const voterEmail = decodeURIComponent(voterEmailEncoded);
    const matchId = decodeURIComponent(matchIdEncoded);

    console.log('🔍 Controllo voti per:', { voterEmail, matchId });

    // Configurazione Airtable
    const airtable = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    });

    const base = airtable.base(process.env.AIRTABLE_BASE_ID);

    // ✅ Controllo voti esistenti
    const records = await base('votes').select({
      filterByFormula: `AND({fromPlayerId} = '${voterEmail}', {matchId} = '${matchId}')`
    }).firstPage();

    const hasVoted = records.length > 0;

    const result = {
      voterEmail: voterEmail,
      matchId: matchId,
      hasVoted,
      recordsFound: records.length
    };

    console.log('✅ Risultato controllo voti:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ Errore controllo voti:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Errore nel controllo voti', 
        details: error.message || 'Unknown error' 
      })
    };
  }
}; 