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
    // Estrai l'email dal path
    const pathSegments = event.path.split('/');
    const emailEncoded = pathSegments[pathSegments.length - 1];
    
    if (!emailEncoded) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email mancante nel path' })
      };
    }

    const email = decodeURIComponent(emailEncoded);

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

    // ✅ NUOVO: Strategia ibrida - Totali da player_stats + ultima partita da votes
    console.log('💡 Strategia ibrida: Totali da player_stats + ultima partita da votes');

    // 1. Prova a recuperare i totali aggregati da player_stats
    let playerStatsRecord = null;
    try {
      const playerStatsRecords = await base('player_stats').select({
        filterByFormula: `{playerEmail} = "${email}"`
      }).firstPage();

      if (playerStatsRecords && playerStatsRecords.length > 0) {
        playerStatsRecord = playerStatsRecords[0];
        console.log('✅ Player trovato in player_stats');
      }
    } catch (error) {
      console.log('❌ Errore nel recupero da player_stats:', error.message);
    }

    // 2. Calcola statistiche da player_stats se disponibili
    let statistics = null;
    if (playerStatsRecord) {
      const upVotes = playerStatsRecord.get('upVotes') || 0;
      const downVotes = playerStatsRecord.get('downVotes') || 0;
      const neutralVotes = playerStatsRecord.get('neutralVotes') || 0;
      const motmVotes = playerStatsRecord.get('motmVotes') || 0;

      const totalVotes = upVotes + downVotes + neutralVotes;
      const netVotes = upVotes - downVotes;
      const upPercentage = totalVotes > 0 ? ((upVotes / totalVotes) * 100).toFixed(1) : '0';

      // Recupera i veri premi Man of the Match dalla tabella player_awards
      let actualMotm = 0;
      try {
        const awardsRecords = await base('player_awards').select({
          filterByFormula: `AND({player_email} = "${email}", {award_type} = "motm")`
        }).all();
        actualMotm = awardsRecords.length;
      } catch (awardsError) {
        console.log('Tabella player_awards non disponibile, usando valore 0 per MotM');
        actualMotm = 0;
      }

      statistics = {
        totalVotes,
        upVotes,
        downVotes,
        neutralVotes,
        motmVotes,
        netVotes,
        upPercentage: parseFloat(upPercentage),
        actualMotm,
        motmCandidacies: motmVotes // Candidature MOTM
      };

      console.log('📊 Statistiche da player_stats:', statistics);
    }

    // 3. Recupera risultati ultima partita dalla tabella votes
    let lastMatchResults = [];
    try {
      const recentVotesRecords = await base('votes').select({
        filterByFormula: `{toPlayerId} = "${email}"`,
        sort: [{ field: 'matchId', direction: 'desc' }],
        maxRecords: 50 // Prendiamo gli ultimi 50 voti per essere sicuri
      }).all();

      if (recentVotesRecords && recentVotesRecords.length > 0) {
        // Raggruppa per matchId per trovare l'ultima partita
        const votesByMatch = recentVotesRecords.reduce((acc, record) => {
          const matchId = record.get('matchId');
          if (!acc[matchId]) {
            acc[matchId] = { up: 0, down: 0, neutral: 0, motm: 0 };
          }
          
          const voteType = record.get('voteType');
          const motmVote = record.get('motm_vote') || false;
          
          if (voteType === 'UP') {
            acc[matchId].up++;
          } else if (voteType === 'DOWN') {
            acc[matchId].down++;
          } else if (voteType === 'NEUTRAL') {
            acc[matchId].neutral++;
          }
          
          if (motmVote) {
            acc[matchId].motm++;
          }
          
          return acc;
        }, {});

        // Converti in array e prendi solo l'ultima partita
        lastMatchResults = Object.entries(votesByMatch).map(([matchId, votes]) => ({
          matchId,
          upVotes: votes.up,
          downVotes: votes.down,
          neutralVotes: votes.neutral,
          motmVotes: votes.motm,
          netVotes: votes.up - votes.down,
          wasMotmCandidate: votes.motm > 0
        })).slice(0, 1); // Solo ultima partita

        console.log('🎯 Risultati ultima partita da votes:', lastMatchResults);
      }
    } catch (error) {
      console.log('❌ Errore nel recupero da votes per ultima partita:', error.message);
    }

    // 4. Se non abbiamo statistics da player_stats, fallback a votes (vecchio comportamento)
    if (!statistics) {
      console.log('⚠️ Fallback: Calcolo da votes (player_stats non disponibile)');
      
      const allVotesRecords = await base('votes').select({
        filterByFormula: `{toPlayerId} = "${email}"`,
        sort: [{ field: 'matchId', direction: 'desc' }]
      }).all();

      const votes = allVotesRecords.map(record => ({
        id: record.id,
        voterEmail: record.get('fromPlayerId'),
        voteType: record.get('voteType'),
        motmVote: record.get('motm_vote') || false,
        matchId: record.get('matchId'),
        toPlayerId: record.get('toPlayerId')
      }));

      const totalVotes = votes.length;
      const upVotes = votes.filter(vote => vote.voteType === 'UP').length;
      const downVotes = votes.filter(vote => vote.voteType === 'DOWN').length;
      const neutralVotes = votes.filter(vote => vote.voteType === 'NEUTRAL').length;
      const motmVotes = votes.filter(vote => vote.motmVote).length;
      const netVotes = upVotes - downVotes;
      const upPercentage = totalVotes > 0 ? ((upVotes / totalVotes) * 100).toFixed(1) : '0';

      // Recupera premi MotM effettivi
      let actualMotm = 0;
      try {
        const awardsRecords = await base('player_awards').select({
          filterByFormula: `AND({player_email} = "${email}", {award_type} = "motm")`
        }).all();
        actualMotm = awardsRecords.length;
      } catch (awardsError) {
        actualMotm = 0;
      }

      statistics = {
        totalVotes,
        upVotes,
        downVotes,
        neutralVotes,
        motmVotes,
        netVotes,
        upPercentage: parseFloat(upPercentage),
        actualMotm,
        motmCandidacies: motmVotes
      };
    }

    const responseData = {
      success: true,
      playerEmail: email,
      votes: [], // I singoli voti non sono più necessari per il frontend
      statistics: statistics,
      matchResults: lastMatchResults, // ✅ NUOVO: Solo ultima partita dalla tabella votes
      source: statistics && playerStatsRecord ? 'hybrid_player_stats_and_votes' : 'fallback_votes_only' // Indicatore per debug
    };

    console.log('✅ Risposta finale:', { 
      source: responseData.source, 
      hasStatistics: !!statistics, 
      hasMatchResults: lastMatchResults.length > 0 
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    };

  } catch (error) {
    console.error('Errore nel recupero storico votazioni completo:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Errore nel recupero dello storico votazioni completo',
        details: error.message || 'Errore sconosciuto'
      })
    };
  }
}; 