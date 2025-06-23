const Airtable = require('airtable');

exports.handler = async (event, context) => {
  // Gestione CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  try {
    // Configurazione Airtable
    const airtable = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    });

    const base = airtable.base(process.env.AIRTABLE_BASE_ID);

    if (event.httpMethod === 'GET') {
      console.log('🔍 DEBUG: Ricerca partite bloccate con votazioni aperte...');
      
      // 1. Trova tutte le partite completate
      const completedMatches = await base('matches').select({
        filterByFormula: `{completed} = TRUE()`
      }).all();

      console.log(`🔍 Trovate ${completedMatches.length} partite completate`);

      const results = [];
      
      for (const match of completedMatches) {
        const matchId = match.get('IDmatch');
        const matchDate = match.get('date');
        const teamA = JSON.parse(match.get('teamA') || '[]');
        const teamB = JSON.parse(match.get('teamB') || '[]');
        const allPlayers = [...teamA, ...teamB];
        
        // Calcola tempo trascorso dalla data della partita
        let hoursElapsed = 0;
        let isTimeout = false;
        
        if (matchDate) {
          const matchTime = new Date(matchDate).getTime();
          const now = new Date().getTime();
          const timeElapsed = now - matchTime;
          hoursElapsed = timeElapsed / (60 * 60 * 1000);
          isTimeout = hoursElapsed > 24; // Timeout dopo 24 ore
        }
        
        // Controlla i voti per questa partita
        const voteRecords = await base('votes').select({
          filterByFormula: `{matchId} = "${matchId}"`
        }).all();
        
        // Usa fromPlayerId (campo corretto nella tabella votes)
        const uniqueVoters = new Set(
          voteRecords
            .map(vote => vote.get('fromPlayerId'))
            .filter(email => email != null && email !== '') // Filtra valori nulli/vuoti
        );
        const votersFromMatch = allPlayers.filter(email => uniqueVoters.has(email));
        
        // Una partita è "bloccata" se:
        // 1. È passato più di 1 ora dalla partita E
        // 2. Non tutti i giocatori hanno votato
        const isStuck = hoursElapsed > 1 && votersFromMatch.length < allPlayers.length;
        
        // Aggiungi solo partite che potrebbero essere bloccate o in attesa
        if (isStuck || votersFromMatch.length < allPlayers.length) {
          results.push({
            matchId,
            matchDate,
            hoursElapsed: Math.round(hoursElapsed * 10) / 10,
            isTimeout,
            isStuck,
            totalPlayers: allPlayers.length,
            playersVoted: votersFromMatch.length,
            playersWhoVoted: Array.from(uniqueVoters),
            playersWhoHaventVoted: allPlayers.filter(email => !uniqueVoters.has(email)),
            teamA,
            teamB,
            scoreA: match.get('scoreA'),
            scoreB: match.get('scoreB'),
            status: isTimeout ? 'TIMEOUT_STUCK' : (isStuck ? 'STUCK' : 'WAITING_VOTES'),
            voteRecordsFound: voteRecords.length
          });
        }
      }
      
      // Ordina per ore trascorse (i più bloccati prima)
      results.sort((a, b) => b.hoursElapsed - a.hoursElapsed);
      
      const stuckCount = results.filter(r => r.isStuck).length;
      const timeoutCount = results.filter(r => r.isTimeout).length;
      
      console.log(`🔍 DEBUG completato - ${results.length} partite con problemi di votazione`);
      console.log(`📊 Bloccate: ${stuckCount}, Timeout: ${timeoutCount}`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Trovate ${results.length} partite con votazioni incomplete`,
          stuckMatches: stuckCount,
          timeoutMatches: timeoutCount,
          waitingMatches: results.filter(r => !r.isStuck && !r.isTimeout).length,
          results,
          timestamp: new Date().toISOString()
        })
      };
    }

    // Metodo non supportato
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non supportato' })
    };

  } catch (error) {
    console.error('❌ Errore nel debug partite bloccate:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Errore nel debug partite bloccate',
        details: error.message || 'Errore sconosciuto'
      })
    };
  }
}; 