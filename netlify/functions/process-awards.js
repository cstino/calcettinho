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

    // Configurazione Airtable
    const baseId = process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_API_KEY;
    if (!baseId || !apiKey) {
      throw new Error('Configurazione Airtable mancante');
    }

    Airtable.configure({ apiKey });
    const base = Airtable.base(baseId);

    console.log('🏁 PROCESS AWARDS (Fase 1): partita', matchId);

    // 1) Recupera dettagli partita
    const matchRecords = await base('matches').select({
      filterByFormula: `{IDmatch} = "${matchId}"`
    }).all();

    if (matchRecords.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Partita non trovata' })
      };
    }

    const match = matchRecords[0];
    const playerStats = JSON.parse(match.get('playerStats') || '{}');
    const teamA = Array.isArray(match.get('teamA')) ? match.get('teamA') : JSON.parse(match.get('teamA') || '[]');
    const teamB = Array.isArray(match.get('teamB')) ? match.get('teamB') : JSON.parse(match.get('teamB') || '[]');
    const scoreA = Number(match.get('scoreA')) || 0;
    const scoreB = Number(match.get('scoreB')) || 0;

    const isDraw = scoreA === scoreB;
    const teamAWins = scoreA > scoreB;
    const allPlayers = [...teamA, ...teamB];

    // 2) Aggiorna player_stats (gol/assist/presenze ecc.)
    console.log('📊 Aggiornamento player_stats per', allPlayers.length, 'giocatori');
    for (const playerEmail of allPlayers) {
      try {
        const statsRecords = await base('player_stats').select({
          filterByFormula: `{playerEmail} = "${playerEmail}"`
        }).all();

        const matchStats = playerStats[playerEmail] || { gol: 0, assist: 0, gialli: 0, rossi: 0 };
        const isInTeamA = teamA.includes(playerEmail);
        const isWin = !isDraw && ((isInTeamA && teamAWins) || (!isInTeamA && !teamAWins));
        const isLoss = !isDraw && !isWin;

        if (statsRecords.length > 0) {
          const rec = statsRecords[0];
          const current = {
            gol: Number(rec.get('Gol')) || 0,
            partiteDisputate: Number(rec.get('partiteDisputate')) || 0,
            partiteVinte: Number(rec.get('partiteVinte')) || 0,
            partitePareggiate: Number(rec.get('partitePareggiate')) || 0,
            partitePerse: Number(rec.get('partitePerse')) || 0,
            assistenze: Number(rec.get('assistenze')) || 0,
            cartelliniGialli: Number(rec.get('cartelliniGialli')) || 0,
            cartelliniRossi: Number(rec.get('cartelliniRossi')) || 0
          };

          const updated = {
            Gol: current.gol + (matchStats.gol || 0),
            partiteDisputate: current.partiteDisputate + 1,
            partiteVinte: current.partiteVinte + (isWin ? 1 : 0),
            partitePareggiate: current.partitePareggiate + (isDraw ? 1 : 0),
            partitePerse: current.partitePerse + (isLoss ? 1 : 0),
            assistenze: current.assistenze + (matchStats.assist || 0),
            cartelliniGialli: current.cartelliniGialli + (matchStats.gialli || 0),
            cartelliniRossi: current.cartelliniRossi + (matchStats.rossi || 0)
          };

          await base('player_stats').update(rec.id, updated);
        } else {
          const created = {
            playerEmail,
            Gol: matchStats.gol || 0,
            partiteDisputate: 1,
            partiteVinte: isWin ? 1 : 0,
            partitePareggiate: isDraw ? 1 : 0,
            partitePerse: isLoss ? 1 : 0,
            assistenze: matchStats.assist || 0,
            cartelliniGialli: matchStats.gialli || 0,
            cartelliniRossi: matchStats.rossi || 0
          };
          await base('player_stats').create(created);
        }
      } catch (e) {
        console.error(`❌ Errore aggiornando player_stats per ${playerEmail}:`, e);
      }
    }

    // 3) Controllo milestone (special_cards => threshold_met su player_stats)
    console.log('🎯 Controllo milestone post-aggiornamento');
    const awardDetails = [];
    try {
      const milestones = await base('special_cards').select({
        filterByFormula: `AND({is_active} = TRUE(), {condition_type} = "player_stats", {ranking_behavior} = "threshold_met")`
      }).all();

      for (const playerEmail of allPlayers) {
        const statsRecords = await base('player_stats').select({
          filterByFormula: `{playerEmail} = "${playerEmail}"`
        }).all();
        if (statsRecords.length === 0) continue;
        const stats = statsRecords[0];

        for (const m of milestones) {
          const templateId = m.get('template_id');
          const conditionField = m.get('condition_field');
          const conditionValue = Number(m.get('condition_value')) || 0;
          const currentValue = Number(stats.get(conditionField)) || 0;
          if (currentValue >= conditionValue) {
            const existing = await base('player_awards').select({
              filterByFormula: `AND({player_email} = "${playerEmail}", {award_type} = "${templateId}")`
            }).all();
            if (existing.length === 0) {
              await base('player_awards').create({
                player_email: playerEmail,
                award_type: templateId,
                match_id: matchId,
                status: 'pending',
                unlocked_at: '',
                selected: false
              });
              awardDetails.push({ playerEmail, awardType: templateId, matchId });
            }
          }
        }
      }
    } catch (milestoneErr) {
      console.error('❌ Errore controllo milestone:', milestoneErr);
    }

    // 4) Imposta apertura votazioni
    try {
      await base('matches').update(match.id, {
        voting_started_at: new Date().toISOString(),
        voting_status: 'open'
      });
    } catch (tsErr) {
      console.log('⚠️ Errore impostando voting_started_at:', tsErr);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'FASE 1: Statistiche aggiornate e milestone controllate',
        phase: 1,
        awards: awardDetails.length,
        awardDetails
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