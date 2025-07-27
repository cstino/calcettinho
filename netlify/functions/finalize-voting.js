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
    
    // Leggi il body per vedere se è una finalizzazione forzata
    const body = JSON.parse(event.body || '{}');
    const isForced = body.force === true;
    
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
    
    console.log('🗳️ FINALIZE VOTING: Finalizzando votazioni per partita:', matchId, isForced ? '(FORZATA)' : '');
    
    // Configurazione Airtable
    const airtable = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    });

    const base = airtable.base(process.env.AIRTABLE_BASE_ID);

    // ✅ ALGORITMO FAIR: Calcola cambiamento statistiche
    function calculateStatChange(currentOverall, baseChange, netVotes) {
      // Parametri bilanciati per crescita ottimale
      const voteBonus = netVotes * 0.095; // Impatto voti aumentato
      const totalChange = baseChange + voteBonus; // baseChange ora è ±0.25
      
      // Moltiplicatore Fair graduale basato sulla distanza dalla media
      const MEDIA = 83.95; // Media attuale del sistema
      const MIN_OVERALL = 56; // Minimo registrato
      const MAX_OVERALL = 99; // Massimo possibile
      
      // Calcola distanza normalizzata dalla media (-1 a +1)
      const distanceFromMean = (currentOverall - MEDIA) / (MAX_OVERALL - MIN_OVERALL);
      
      let multiplier = 1.0;
      
      if (totalChange > 0) {
        // CRESCITA: Più sei forte, più è difficile crescere
        multiplier = 1.0 - (distanceFromMean * 0.5);
      } else {
        // DECRESCITA: Più sei forte, più cali drasticamente  
        multiplier = 1.0 + (distanceFromMean * 0.7);
      }
      
      return totalChange * multiplier;
    }

    // Controlla se le votazioni sono chiuse (tutti hanno votato OR 24 ore passate)
    async function checkVotingClosed(matchId) {
      try {
        // 1. Recupera dettagli partita
        const matchRecords = await base('matches').select({
          filterByFormula: `{IDmatch} = "${matchId}"`
        }).all();

        if (matchRecords.length === 0) {
          return { closed: false, reason: 'Partita non trovata' };
        }

        const match = matchRecords[0];
        const teamA = JSON.parse(match.get('teamA') || '[]');
        const teamB = JSON.parse(match.get('teamB') || '[]');
        const allPlayers = [...teamA, ...teamB];
        const votingStartedAt = match.get('voting_started_at');

        // 2. Controlla se sono passate 24 ore
        if (votingStartedAt) {
          const startTime = new Date(votingStartedAt).getTime();
          const now = new Date().getTime();
          const hours24 = 24 * 60 * 60 * 1000; // 24 ore in millisecondi

          if (now - startTime > hours24) {
            return { closed: true, reason: '24 ore trascorse - chiusura automatica' };
          }
        }

        // 3. Controlla se tutti hanno votato
        const voteRecords = await base('votes').select({
          filterByFormula: `{matchId} = "${matchId}"`
        }).all();

        const uniqueVoters = new Set(voteRecords.map(vote => vote.get('fromPlayerId')));
        const playersVoted = allPlayers.filter(email => uniqueVoters.has(email));

        console.log(`🗳️ Controllo votazioni - Giocatori partita: ${allPlayers.length}, Hanno votato: ${playersVoted.length}`);

        if (playersVoted.length === allPlayers.length) {
          return { closed: true, reason: 'Tutti i giocatori hanno votato' };
        }

        return { closed: false, reason: `${playersVoted.length}/${allPlayers.length} giocatori hanno votato` };

      } catch (error) {
        console.error('❌ Errore nel controllo chiusura votazioni:', error);
        return { closed: false, reason: 'Errore nel controllo' };
      }
    }

    // 1. Controlla se le votazioni sono chiuse (salta se forzata)
    let votingStatus;
    if (!isForced) {
      votingStatus = await checkVotingClosed(matchId);
      
      if (!votingStatus.closed) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Votazioni ancora aperte',
            reason: votingStatus.reason,
            status: 'waiting'
          })
        };
      }

      console.log(`✅ Votazioni chiuse: ${votingStatus.reason}`);
    } else {
      console.log(`🔧 Finalizzazione FORZATA - Saltando controllo votazioni`);
      votingStatus = { closed: true, reason: 'Finalizzazione forzata dall\'admin' };
    }

    // 2. Recupera i dettagli della partita
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
    const teamA = JSON.parse(match.get('teamA') || '[]');
    const teamB = JSON.parse(match.get('teamB') || '[]');
    const scoreA = Number(match.get('scoreA')) || 0;
    const scoreB = Number(match.get('scoreB')) || 0;
    const isDraw = scoreA === scoreB;
    const teamAWins = scoreA > scoreB;

    // 3. Recupera tutti i voti per questa partita
    const voteRecords = await base('votes').select({
      filterByFormula: `{matchId} = "${matchId}"`
    }).all();

    // 4. Calcola statistiche voti per UP/DOWN/NEUTRAL + MOTM
    const voteStats = {};
    
    voteRecords.forEach(vote => {
      const playerEmail = vote.get('toPlayerId');
      const voteType = vote.get('voteType');
      const motmVote = vote.get('motm_vote');
      
      if (!voteStats[playerEmail]) {
        voteStats[playerEmail] = { up: 0, down: 0, neutral: 0, net: 0, motm: 0 };
      }
      
      // Conta i voti per tipo
      if (voteType === 'UP') {
        voteStats[playerEmail].up++;
      } else if (voteType === 'DOWN') {
        voteStats[playerEmail].down++;
      } else if (voteType === 'NEUTRAL') {
        voteStats[playerEmail].neutral++;
      }
      
      // Conta i voti MOTM separatamente
      if (motmVote) {
        voteStats[playerEmail].motm++;
      }
      
      // Calcola net votes (UP - DOWN, NEUTRAL non influisce)
      voteStats[playerEmail].net = voteStats[playerEmail].up - voteStats[playerEmail].down;
    });

    console.log('📊 Statistiche voti finali:', voteStats);

    // 5. ✅ CALCOLA E ASSEGNA MOTM (basato sui voti)
    const motmAwards = [];

    const sortedByMOTM = Object.entries(voteStats)
      .sort(([,a], [,b]) => b.motm - a.motm)
      .filter(([email]) => [...teamA, ...teamB].includes(email))
      .filter(([,stats]) => stats.motm > 0); // Solo chi ha ricevuto almeno 1 voto MOTM

    console.log('🏆 Classifica MOTM:', sortedByMOTM.map(([email, stats]) => ({ email, motmVotes: stats.motm })));

    if (sortedByMOTM.length > 0) {
      const [topPlayerEmail, topPlayerVotes] = sortedByMOTM[0];
      const tied = sortedByMOTM.filter(([,votes]) => votes.motm === topPlayerVotes.motm);
      
      console.log(`🥇 Top MOTM: ${topPlayerEmail} con ${topPlayerVotes.motm} voti MOTM`);
      
      if (tied.length === 1) {
        // Un solo vincitore
        motmAwards.push({
          playerEmail: topPlayerEmail,
          awardType: 'motm',
          matchId
        });
        console.log(`✅ MOTM assegnato a: ${topPlayerEmail}`);
      } else {
        // Pareggio - decide la squadra vincente o entrambi se pareggio
        const tiedFromWinningTeam = tied.filter(([email]) => 
          !isDraw && ((teamAWins && teamA.includes(email)) || (!teamAWins && teamB.includes(email)))
        );
        
        if (tiedFromWinningTeam.length > 0) {
          // Vince chi è nella squadra vincente
          tiedFromWinningTeam.forEach(([email]) => {
            motmAwards.push({
              playerEmail: email,
              awardType: 'motm',
              matchId
            });
          });
          console.log(`✅ MOTM assegnato a squadra vincente: ${tiedFromWinningTeam.map(([email]) => email).join(', ')}`);
        } else {
          // Stessa squadra o pareggio - tutti vincono
          tied.forEach(([email]) => {
            motmAwards.push({
              playerEmail: email,
              awardType: 'motm',
              matchId
            });
          });
          console.log(`✅ MOTM assegnato a tutti i pareggiati: ${tied.map(([email]) => email).join(', ')}`);
        }
      }
    } else {
      console.log('❌ Nessun voto MOTM ricevuto, premio non assegnato');
    }

    // 6. Salva MOTM awards
    if (motmAwards.length > 0) {
      try {
        for (const award of motmAwards) {
          // Verifica se il giocatore ha già MOTM (per evitare duplicati)
          const existingMOTM = await base('player_awards').select({
            filterByFormula: `AND({player_email} = "${award.playerEmail}", {award_type} = "motm", {match_id} = "${matchId}")`
          }).all();

          if (existingMOTM.length === 0) {
            await base('player_awards').create({
              player_email: award.playerEmail,
              award_type: award.awardType,
              match_id: award.matchId,
              status: 'pending',
              unlocked_at: '',
              selected: false
            });
            console.log(`✅ MOTM salvato per: ${award.playerEmail}`);
          } else {
            console.log(`⚠️ MOTM già esistente per ${award.playerEmail}`);
          }
        }
      } catch (error) {
        console.error('❌ Errore nel salvare MOTM:', error);
      }
    }

    // 7. ✅ AGGIORNA ABILITÀ GIOCATORI (Algoritmo Fair completo)
    console.log('🎯 Aggiornamento abilità giocatori con Algoritmo Fair...');
    
    const allPlayers = [...teamA, ...teamB];
    const statUpdates = [];

    for (const playerEmail of allPlayers) {
      try {
        // Recupera statistiche attuali
        const playerRecords = await base('players').select({
          filterByFormula: `{email} = "${playerEmail}"`
        }).all();

        if (playerRecords.length === 0) {
          console.log(`⚠️ Giocatore ${playerEmail} non trovato in tabella players`);
          continue;
        }

        const player = playerRecords[0];
        const currentStats = {
          ATT: Number(player.get('Attacco')) || 50,
          DIF: Number(player.get('Difesa')) || 50,
          VEL: Number(player.get('Velocità')) || 50,
          PAS: Number(player.get('Passaggio')) || 50,
          FOR: Number(player.get('Forza')) || 50,
          POR: Number(player.get('Portiere')) || 50
        };

        // Calcola overall come media delle 5 migliori statistiche
        const statValues = Object.values(currentStats);
        const top5Stats = statValues.sort((a, b) => b - a).slice(0, 5);
        const currentOverall = top5Stats.reduce((sum, val) => sum + val, 0) / 5;

        // ✅ ALGORITMO FAIR: Calcola cambiamento base
        const playerTeam = teamA.includes(playerEmail) ? 'A' : 'B';
        let baseChange = 0;
        
        if (!isDraw) {
          if ((playerTeam === 'A' && teamAWins) || (playerTeam === 'B' && !teamAWins)) {
            baseChange = 0.25; // Vittoria
          } else {
            baseChange = -0.25; // Sconfitta
          }
        }
        // Pareggio: baseChange = 0 (solo voti influiscono)

        // ✅ CALCOLA CAMBIAMENTO CON ALGORITMO FAIR (voti inclusi)
        const netVotes = voteStats[playerEmail]?.net || 0;
        const totalChange = calculateStatChange(currentOverall, baseChange, netVotes);

        console.log(`🎯 ${playerEmail}: Overall=${currentOverall.toFixed(1)}, BaseChange=${baseChange}, NetVotes=${netVotes}, TotalChange=${totalChange.toFixed(3)}`);

        // Applica i cambiamenti
        const newStats = {};
        Object.entries(currentStats).forEach(([stat, value]) => {
          const newValue = Math.max(1.0, Math.min(99.0, value + totalChange));
          const fieldName = stat === 'ATT' ? 'Attacco' :
                           stat === 'DIF' ? 'Difesa' :
                           stat === 'VEL' ? 'Velocità' :
                           stat === 'PAS' ? 'Passaggio' :
                           stat === 'FOR' ? 'Forza' :
                           stat === 'POR' ? 'Portiere' : stat;
          newStats[fieldName] = Math.round(newValue * 10) / 10; // Arrotonda a 1 decimale
        });

        // Aggiorna il record
        await base('players').update(player.id, newStats);
        
        statUpdates.push({
          email: playerEmail,
          changes: Object.fromEntries(
            Object.entries(currentStats).map(([stat, oldVal]) => [
              stat, 
              Math.round((newStats[stat === 'ATT' ? 'Attacco' : stat === 'DIF' ? 'Difesa' : stat === 'VEL' ? 'Velocità' : stat === 'PAS' ? 'Passaggio' : stat === 'FOR' ? 'Forza' : 'Portiere'] - oldVal) * 1000) / 1000
            ])
          )
        });

        console.log(`✅ Abilità aggiornate per ${playerEmail}:`, statUpdates[statUpdates.length - 1].changes);

      } catch (error) {
        console.error(`❌ Errore nell'aggiornamento abilità per ${playerEmail}:`, error);
      }
    }

    // 8. Aggiorna stato votazioni
    try {
      await base('matches').update(match.id, {
        voting_status: 'closed',
        voting_closed_at: new Date().toISOString(),
        voting_close_reason: votingStatus.reason
      });
      console.log('🗳️ Stato votazioni aggiornato a "closed"');
    } catch (error) {
      console.log('⚠️ Errore nell\'aggiornare stato votazioni:', error);
    }

    // 9. ✅ NUOVO: Aggrega i voti in player_stats e pulisce la tabella votes
    console.log('📊 PHASE 3: Aggregazione voti in player_stats...');
    
    try {
      // Recupera tutti i voti per questa partita
      const matchVotesRecords = await base('votes').select({
        filterByFormula: `{matchId} = "${matchId}"`
      }).all();

      console.log(`📊 Trovati ${matchVotesRecords.length} voti per la partita ${matchId}`);

      if (matchVotesRecords.length > 0) {
        // Aggrega i voti per giocatore
        const voteAggregation = {};
        
        matchVotesRecords.forEach(record => {
          const toPlayerId = record.get('toPlayerId');
          const voteType = record.get('voteType');
          const motmVote = record.get('motm_vote') || false;

          if (!voteAggregation[toPlayerId]) {
            voteAggregation[toPlayerId] = {
              upVotes: 0,
              downVotes: 0,
              neutralVotes: 0,
              motmVotes: 0
            };
          }

          if (voteType === 'UP') {
            voteAggregation[toPlayerId].upVotes++;
          } else if (voteType === 'DOWN') {
            voteAggregation[toPlayerId].downVotes++;
          } else if (voteType === 'NEUTRAL') {
            voteAggregation[toPlayerId].neutralVotes++;
          }

          if (motmVote) {
            voteAggregation[toPlayerId].motmVotes++;
          }
        });

        console.log('📊 Voti aggregati per giocatore:', voteAggregation);

        // Aggiorna player_stats per ogni giocatore
        const playersUpdated = [];
        for (const [playerEmail, votes] of Object.entries(voteAggregation)) {
          try {
            // Cerca il record esistente
            const playerStatsRecords = await base('player_stats').select({
              filterByFormula: `{playerEmail} = "${playerEmail}"`
            }).firstPage();

            if (playerStatsRecords && playerStatsRecords.length > 0) {
              // Record esistente - aggiorna
              const record = playerStatsRecords[0];
              const currentUpVotes = record.get('upVotes') || 0;
              const currentDownVotes = record.get('downVotes') || 0;
              const currentNeutralVotes = record.get('neutralVotes') || 0;
              const currentMotmVotes = record.get('motmVotes') || 0;

              await base('player_stats').update(record.id, {
                upVotes: currentUpVotes + votes.upVotes,
                downVotes: currentDownVotes + votes.downVotes,
                neutralVotes: currentNeutralVotes + votes.neutralVotes,
                motmVotes: currentMotmVotes + votes.motmVotes
              });

              playersUpdated.push(`${playerEmail} (aggiornato)`);
            } else {
              // Record non esistente - crea nuovo
              await base('player_stats').create({
                playerEmail: playerEmail,
                Gol: 0,
                Assist: 0,
                Clean_Sheet: 0,
                Vittorie: 0,
                Presenze: 0,
                upVotes: votes.upVotes,
                downVotes: votes.downVotes,
                neutralVotes: votes.neutralVotes,
                motmVotes: votes.motmVotes
              });

              playersUpdated.push(`${playerEmail} (creato)`);
            }
          } catch (playerError) {
            console.error(`❌ Errore nell'aggiornare player_stats per ${playerEmail}:`, playerError);
          }
        }

        console.log(`✅ Player stats aggiornati: ${playersUpdated.join(', ')}`);

        // Elimina i voti di questa partita dalla tabella votes
        console.log('🗑️ Eliminazione voti della partita dalla tabella votes...');
        
        const votesToDelete = matchVotesRecords.map(record => record.id);
        
        // Elimina in batch da 10 (limite Airtable)
        for (let i = 0; i < votesToDelete.length; i += 10) {
          const batch = votesToDelete.slice(i, i + 10);
          await base('votes').destroy(batch);
          console.log(`🗑️ Eliminati ${batch.length} voti (batch ${Math.floor(i/10) + 1})`);
        }

        console.log(`✅ Eliminati tutti i ${votesToDelete.length} voti della partita ${matchId}`);
      }
    } catch (aggregationError) {
      console.error('❌ Errore nell\'aggregazione voti:', aggregationError);
      // Non interrompiamo il processo per errori di aggregazione
    }

    console.log('🏁 FINALIZE VOTING completata: MOTM assegnato, abilità aggiornate e voti aggregati!');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Votazioni finalizzate - MOTM assegnato, abilità aggiornate e voti aggregati in player_stats',
        motmAwards: motmAwards.length,
        motmDetails: motmAwards,
        playerAbilitiesUpdated: statUpdates.length,
        statUpdates: statUpdates,
        voteStats: voteStats,
        votingCloseReason: votingStatus.reason,
        phase: 'finalized_with_aggregation'
      })
    };

  } catch (error) {
    console.error('❌ FINALIZE VOTING: Errore nel processamento:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Errore nella finalizzazione votazioni',
        details: error.message || 'Errore sconosciuto'
      })
    };
  }
}; 