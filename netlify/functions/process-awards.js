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
    
    console.log('🏁 PROCESS AWARDS: Processando statistiche per partita:', matchId);
    
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
    const playerStats = JSON.parse(match.get('playerStats') || '{}');
    const teamA = JSON.parse(match.get('teamA') || '[]');
    const teamB = JSON.parse(match.get('teamB') || '[]');
    const scoreA = Number(match.get('scoreA')) || 0;
    const scoreB = Number(match.get('scoreB')) || 0;
    
    // 2. Determina la squadra vincente
    const isDraw = scoreA === scoreB;
    const teamAWins = scoreA > scoreB;

    console.log(`📊 Partita: Team A ${scoreA} - ${scoreB} Team B`);
    console.log(`🏆 Risultato: ${isDraw ? 'Pareggio' : (teamAWins ? 'Vince Team A' : 'Vince Team B')}`);

    // 3. Aggiorna le statistiche per ogni giocatore
    const allPlayers = [...teamA, ...teamB];
    let statsUpdated = 0;

    for (const playerEmail of allPlayers) {
      try {
        // Determina squadra e risultato per questo giocatore
        const playerTeam = teamA.includes(playerEmail) ? 'A' : 'B';
        const isWin = !isDraw && ((playerTeam === 'A' && teamAWins) || (playerTeam === 'B' && !teamAWins));
        const isLoss = !isDraw && !isWin;
        
        // Statistiche della partita per questo giocatore
        const matchStats = playerStats[playerEmail] || { gol: 0, assist: 0, gialli: 0, rossi: 0 };
        
        // Trova o crea le statistiche del giocatore
        const existingStatsRecords = await base('player_stats').select({
          filterByFormula: `{playerEmail} = "${playerEmail}"`
        }).all();

        let currentStats = {
          gol: 0,
          partiteDisputate: 0,
          partiteVinte: 0,
          partitePareggiate: 0,
          partitePerse: 0,
          assistenze: 0,
          cartelliniGialli: 0,
          cartelliniRossi: 0
        };

        if (existingStatsRecords.length > 0) {
          const existingRecord = existingStatsRecords[0];
          currentStats = {
            gol: Number(existingRecord.get('Gol')) || 0,
            partiteDisputate: Number(existingRecord.get('partiteDisputate')) || 0,
            partiteVinte: Number(existingRecord.get('partiteVinte')) || 0,
            partitePareggiate: Number(existingRecord.get('partitePareggiate')) || 0,
            partitePerse: Number(existingRecord.get('partitePerse')) || 0,
            assistenze: Number(existingRecord.get('assistenze')) || 0,
            cartelliniGialli: Number(existingRecord.get('cartelliniGialli')) || 0,
            cartelliniRossi: Number(existingRecord.get('cartelliniRossi')) || 0
          };
        }

        // Calcola le nuove statistiche
        const updatedStats = {
          playerEmail: playerEmail,
          Gol: currentStats.gol + (matchStats.gol || 0),
          partiteDisputate: currentStats.partiteDisputate + 1,
          partiteVinte: currentStats.partiteVinte + (isWin ? 1 : 0),
          partitePareggiate: currentStats.partitePareggiate + (isDraw ? 1 : 0),
          partitePerse: currentStats.partitePerse + (isLoss ? 1 : 0),
          assistenze: currentStats.assistenze + (matchStats.assist || 0),
          cartelliniGialli: currentStats.cartelliniGialli + (matchStats.gialli || 0),
          cartelliniRossi: currentStats.cartelliniRossi + (matchStats.rossi || 0)
        };

        // Aggiorna o crea il record
        if (existingStatsRecords.length > 0) {
          await base('player_stats').update(existingStatsRecords[0].id, updatedStats);
        } else {
          await base('player_stats').create(updatedStats);
        }

        console.log(`✅ Statistiche aggiornate per ${playerEmail}:`, {
          gol: `${currentStats.gol} -> ${updatedStats.Gol}`,
          partite: `${currentStats.partiteDisputate} -> ${updatedStats.partiteDisputate}`,
          risultato: isDraw ? 'pareggio' : (isWin ? 'vittoria' : 'sconfitta')
        });
        
        statsUpdated++;
      } catch (playerError) {
        console.error(`❌ Errore nell'aggiornamento statistiche per ${playerEmail}:`, playerError);
      }
    }

    console.log('✅ PROCESS AWARDS: Statistiche processate con successo');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Statistiche processate con successo',
        matchId,
        awards: 0, // Non gestiamo premi complessi per ora
        isReprocessing: false,
        awardDetails: [],
        playersStatsUpdated: statsUpdated,
        playerStats: {
          playersProcessed: allPlayers.length,
          teamA: teamA.length,
          teamB: teamB.length,
          totalGoals: Object.values(playerStats).reduce((total, stats) => total + (stats.gol || 0), 0)
        }
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