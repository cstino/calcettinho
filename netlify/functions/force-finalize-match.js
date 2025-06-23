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

    // 2. Finalizza assegnando MOTM anche se non tutti hanno votato
    console.log('🔧 Forzando assegnazione MOTM...');
    
    // Trova i voti esistenti per questa partita
    const voteRecords = await base('votes').select({
      filterByFormula: `{matchId} = "${matchId}"`
    }).all();

    const teamA = JSON.parse(match.get('teamA') || '[]');
    const teamB = JSON.parse(match.get('teamB') || '[]');
    const allPlayers = [...teamA, ...teamB];

    // Conta i voti MOTM per ogni giocatore
    const motmVotes = {};
    voteRecords.forEach(vote => {
      const motmPlayer = vote.get('motmPlayer');
      if (motmPlayer && allPlayers.includes(motmPlayer)) {
        motmVotes[motmPlayer] = (motmVotes[motmPlayer] || 0) + 1;
      }
    });

    let motmWinner = null;
    let maxVotes = 0;

    // Trova il giocatore con più voti MOTM
    Object.keys(motmVotes).forEach(player => {
      if (motmVotes[player] > maxVotes) {
        maxVotes = motmVotes[player];
        motmWinner = player;
      }
    });

    console.log(`🏆 Voti MOTM trovati:`, motmVotes);
    console.log(`🏆 Vincitore MOTM: ${motmWinner} con ${maxVotes} voti`);

    let motmAwarded = 0;
    let abilitiesUpdated = 0;

    // Assegna il premio MOTM se c'è un vincitore
    if (motmWinner && maxVotes > 0) {
      try {
        // Controlla se il premio MOTM esiste già
        const existingMotmRecords = await base('player_awards').select({
          filterByFormula: `AND({match_id} = "${matchId}", {award_type} = "motm")`
        }).all();

        if (existingMotmRecords.length === 0) {
          // Assegna il premio MOTM
          await base('player_awards').create({
            playerEmail: motmWinner,
            award_type: 'motm',
            match_id: matchId,
            date_awarded: new Date().toISOString().split('T')[0]
          });
          
          console.log(`🏆 Premio MOTM assegnato a ${motmWinner}`);
          motmAwarded = 1;

          // Aggiorna le abilità del giocatore (esempio: +1 abilità generale)
          try {
            const playerRecords = await base('players').select({
              filterByFormula: `{email} = "${motmWinner}"`
            }).all();

            if (playerRecords.length > 0) {
              const player = playerRecords[0];
              const currentAbility = Number(player.get('abilita_generale')) || 0;
              
              await base('players').update(player.id, {
                abilita_generale: currentAbility + 1
              });
              
              console.log(`🎯 Abilità aggiornata per ${motmWinner}: ${currentAbility} -> ${currentAbility + 1}`);
              abilitiesUpdated = 1;
            }
          } catch (abilityError) {
            console.error('❌ Errore nell\'aggiornamento abilità:', abilityError);
          }
        } else {
          console.log(`⚠️ Premio MOTM già assegnato per la partita ${matchId}`);
        }
      } catch (awardError) {
        console.error('❌ Errore nell\'assegnazione premio MOTM:', awardError);
      }
    } else {
      console.log('⚠️ Nessun vincitore MOTM trovato (nessun voto valido)');
    }

    console.log('✅ FORCE FINALIZE: Partita finalizzata con successo');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Partita finalizzata forzatamente con successo',
        matchId,
        motmAwarded,
        abilitiesUpdated,
        motmWinner,
        totalVotes: Object.values(motmVotes).reduce((a, b) => a + b, 0),
        details: {
          motmVotes,
          playersWhoVoted: voteRecords.length,
          totalPlayers: allPlayers.length
        }
      })
    };

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