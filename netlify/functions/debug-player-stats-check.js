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
    // Estrai l'email dai query parameters
    const email = event.queryStringParameters?.email;
    
    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email mancante nei query parameters' })
      };
    }

    console.log('🔍 Debug check per email:', email);

    // Configurazione Airtable
    const airtable = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    });

    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      throw new Error('Missing Airtable configuration in environment variables');
    }

    const base = Airtable.base(baseId);

    // 1. Controlla player_stats
    let playerStatsCheck = {
      found: false,
      rawData: null,
      processedData: null,
      error: null
    };

    try {
      const playerStatsRecords = await base('player_stats').select({
        filterByFormula: `{playerEmail} = "${email}"`
      }).firstPage();

      if (playerStatsRecords && playerStatsRecords.length > 0) {
        const record = playerStatsRecords[0];
        playerStatsCheck.found = true;
        playerStatsCheck.rawData = {
          id: record.id,
          fields: record.fields
        };

        const upVotes = record.get('upVotes') || 0;
        const downVotes = record.get('downVotes') || 0;
        const neutralVotes = record.get('neutralVotes') || 0;
        const motmVotes = record.get('motmVotes') || 0;

        playerStatsCheck.processedData = {
          upVotes,
          downVotes,
          neutralVotes,
          motmVotes,
          totalVotes: upVotes + downVotes + neutralVotes,
          netVotes: upVotes - downVotes
        };
      }
    } catch (error) {
      playerStatsCheck.error = error.message;
    }

    // 2. Controlla se si userebbe fallback
    const wouldFallbackToVotes = !playerStatsCheck.found;

    // 3. Se fallback, mostra un campione di votes
    let votesSample = null;
    if (wouldFallbackToVotes) {
      try {
        const votesRecords = await base('votes').select({
          filterByFormula: `{toPlayerId} = "${email}"`,
          maxRecords: 5,
          sort: [{ field: 'matchId', direction: 'desc' }]
        }).all();

        votesSample = {
          totalFound: votesRecords.length,
          sample: votesRecords.map(record => ({
            id: record.id,
            voteType: record.get('voteType'),
            motmVote: record.get('motm_vote') || false,
            matchId: record.get('matchId'),
            fromPlayerId: record.get('fromPlayerId')
          }))
        };
      } catch (error) {
        votesSample = { error: error.message };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        email: email,
        timestamp: new Date().toISOString(),
        playerStatsCheck,
        wouldFallbackToVotes,
        votesSample,
        summary: {
          playerStatsAvailable: playerStatsCheck.found,
          dataSource: playerStatsCheck.found ? 'player_stats' : 'votes_fallback',
          upVotes: playerStatsCheck.processedData?.upVotes || 'N/A',
          downVotes: playerStatsCheck.processedData?.downVotes || 'N/A',
          neutralVotes: playerStatsCheck.processedData?.neutralVotes || 'N/A',
          motmVotes: playerStatsCheck.processedData?.motmVotes || 'N/A'
        }
      })
    };

  } catch (error) {
    console.error('Errore nel debug player stats check:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Errore nel debug player stats check',
        details: error.message || 'Errore sconosciuto'
      })
    };
  }
}; 