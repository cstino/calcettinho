import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurazione Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('Credenziali Airtable mancanti');
}

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: apiKey
});

const base = Airtable.base(baseId);

// Funzione rimossa: checkProgressiveCard non più necessaria
// Le card goleador/assistman/matador/regista/goldenboot/elfutbol sono ora milestone basate su statistiche cumulative

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;
    
    console.log('🏁 FASE 1: Processando awards immediate per partita:', matchId);

    // ⚠️ CONTROLLO AGGIORNAMENTO SICURO: Verifica se la partita è già stata processata
    let isReprocessing = false;
    let existingAwards: any[] = [];
    let oldPlayerStats: { [email: string]: any } = {};
    
    try {
      const awardsRecords = await base('player_awards').select({
        filterByFormula: `{match_id} = "${matchId}"`
      }).all();
      existingAwards = [...awardsRecords];
      
      if (existingAwards.length > 0) {
        console.log(`🔄 Partita ${matchId} già processata - MODALITÀ AGGIORNAMENTO SICURO`);
        console.log(`📋 Trovati ${existingAwards.length} premi esistenti da rimuovere`);
        isReprocessing = true;
        
        // Recupera le statistiche vecchie della partita per sottrarle
        const oldMatchRecords = await base('matches').select({
          filterByFormula: `{IDmatch} = "${matchId}"`
        }).all();
        
        if (oldMatchRecords.length > 0) {
          const oldMatch = oldMatchRecords[0];
          oldPlayerStats = JSON.parse(oldMatch.get('playerStats') as string || '{}');
          console.log(`📋 Statistiche vecchie recuperate:`, Object.keys(oldPlayerStats).length, 'giocatori');
        
          // 1. Rimuovi i premi esistenti (SOLO immediate, non MOTM che non era assegnato)
          const immediateAwards = existingAwards.filter(award => 
            award.get('award_type') !== 'motm' // Mantieni MOTM se esiste (sarà gestito da finalize-voting)
          );
          
          if (immediateAwards.length > 0) {
            const deletePromises = [];
            for (let i = 0; i < immediateAwards.length; i += 10) {
              const batch = immediateAwards.slice(i, i + 10);
              deletePromises.push(
                base('player_awards').destroy(batch.map(r => r.id))
              );
            }
            await Promise.all(deletePromises);
            console.log(`✅ Rimossi ${immediateAwards.length} premi immediate obsoleti`);
          }
          
          // 2. Sottrai le statistiche vecchie dalla tabella player_stats
          const oldTeamA = JSON.parse(oldMatch.get('teamA') as string || '[]');
          const oldTeamB = JSON.parse(oldMatch.get('teamB') as string || '[]');
          const oldAllPlayers = [...oldTeamA, ...oldTeamB];
          const oldScoreA = Number(oldMatch.get('scoreA')) || 0;
          const oldScoreB = Number(oldMatch.get('scoreB')) || 0;
          const oldIsDraw = oldScoreA === oldScoreB;
          const oldTeamAWins = oldScoreA > oldScoreB;
          
          console.log(`🔙 Sottraggio statistiche vecchie per ${oldAllPlayers.length} giocatori...`);
          
          for (const playerEmail of oldAllPlayers) {
            try {
              const existingStatsRecords = await base('player_stats').select({
                filterByFormula: `{playerEmail} = "${playerEmail}"`
              }).all();

              if (existingStatsRecords.length > 0) {
                const existingRecord = existingStatsRecords[0];
                const currentStats = {
                  gol: Number(existingRecord.get('Gol')) || 0,
                  partiteDisputate: Number(existingRecord.get('partiteDisputate')) || 0,
                  partiteVinte: Number(existingRecord.get('partiteVinte')) || 0,
                  partitePareggiate: Number(existingRecord.get('partitePareggiate')) || 0,
                  partitePerse: Number(existingRecord.get('partitePerse')) || 0,
                  assistenze: Number(existingRecord.get('assistenze')) || 0,
                  cartelliniGialli: Number(existingRecord.get('cartelliniGialli')) || 0,
                  cartelliniRossi: Number(existingRecord.get('cartelliniRossi')) || 0
                };

                // Determina risultato vecchio per questo giocatore
                const oldPlayerTeam = oldTeamA.includes(playerEmail) ? 'A' : 'B';
                const oldIsWin = !oldIsDraw && ((oldPlayerTeam === 'A' && oldTeamAWins) || (oldPlayerTeam === 'B' && !oldTeamAWins));
                const oldIsLoss = !oldIsDraw && !oldIsWin;
                
                // Statistiche da sottrarre
                const oldMatchStats = oldPlayerStats[playerEmail] || { gol: 0, assist: 0, gialli: 0, rossi: 0 };
                
                const updatedStats = {
                  Gol: Math.max(0, currentStats.gol - (oldMatchStats.gol || 0)),
                  partiteDisputate: Math.max(0, currentStats.partiteDisputate - 1),
                  partiteVinte: Math.max(0, currentStats.partiteVinte - (oldIsWin ? 1 : 0)),
                  partitePareggiate: Math.max(0, currentStats.partitePareggiate - (oldIsDraw ? 1 : 0)),
                  partitePerse: Math.max(0, currentStats.partitePerse - (oldIsLoss ? 1 : 0)),
                  assistenze: Math.max(0, currentStats.assistenze - (oldMatchStats.assist || 0)),
                  cartelliniGialli: Math.max(0, currentStats.cartelliniGialli - (oldMatchStats.gialli || 0)),
                  cartelliniRossi: Math.max(0, currentStats.cartelliniRossi - (oldMatchStats.rossi || 0))
                };

                await base('player_stats').update(existingRecord.id, updatedStats);
                console.log(`🔙 Statistiche sottratte per ${playerEmail}`);
              }
            } catch (error) {
              console.error(`❌ Errore nel sottrarre statistiche per ${playerEmail}:`, error);
            }
          }
          
          console.log(`✅ Aggiornamento sicuro completato - procedo con le nuove statistiche`);
        }
      }
    } catch (awardsCheckError) {
      console.log('Errore nel controllo premi esistenti (potrebbe essere normale se tabella non esiste ancora):', awardsCheckError);
      // Se la tabella player_awards non esiste ancora, continua normalmente
    }

    // 1. Recupera i dettagli della partita
    const matchRecords = await base('matches').select({
      filterByFormula: `{IDmatch} = "${matchId}"`
    }).all();

    if (matchRecords.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Partita non trovata'
      }, { status: 404 });
    }

    const match = matchRecords[0];
    const playerStats = JSON.parse(match.get('playerStats') as string || '{}');
    const teamA = JSON.parse(match.get('teamA') as string || '[]');
    const teamB = JSON.parse(match.get('teamB') as string || '[]');
    const scoreA = Number(match.get('scoreA')) || 0;
    const scoreB = Number(match.get('scoreB')) || 0;
    
    // 2. Determina la squadra vincente
    const isDraw = scoreA === scoreB;
    const teamAWins = scoreA > scoreB;

    // 3. ✅ FASE 1: Calcola solo i premi IMMEDIATE (senza votazioni)
    const awards = [] as Array<{
      playerEmail: string;
      awardType: string;
      matchId: string;
    }>;

    console.log('⚽ Calcolando premi immediate (solo Milestone ora - goleador/assistman sono diventati milestone)...');

    // ✅ NOTA: Goleador e Assistman sono ora MILESTONE basate su statistiche cumulative
    // Non vengono più assegnate come premi post-partita
    // ⚠️ IMPORTANTE: Le milestone vengono controllate DOPO l'aggiornamento delle statistiche

    // 4. Salva i premi IMMEDIATE nella tabella player_awards
    if (awards.length > 0) {
      try {
        for (const award of awards) {
          // Verifica se il giocatore ha già sbloccato una card dello stesso tipo
          const existingAwards = await base('player_awards').select({
            filterByFormula: `AND({player_email} = "${award.playerEmail}", {award_type} = "${award.awardType}", {status} = "unlocked")`
          }).all();

          if (existingAwards.length === 0) {
            // Se non ha già sbloccato una card dello stesso tipo, crea il nuovo premio
            await base('player_awards').create({
              player_email: award.playerEmail,
              award_type: award.awardType,
              match_id: award.matchId,
              status: 'pending',
              unlocked_at: '',
              selected: false
            });
          } else {
            console.log(`⚠️ Giocatore ${award.playerEmail} ha già sbloccato la card ${award.awardType} - Premio non attribuito`);
          }
        }
        console.log('✅ Premi immediate salvati:', awards.length);
      } catch (error) {
        console.error('❌ Errore nel salvare premi immediate:', error);
        // Continua comunque con l'aggiornamento statistiche
      }
    }

    // 5. ✅ AGGIORNA SOLO STATISTICHE BASE (player_stats)
    console.log('📊 Aggiornamento statistiche base (player_stats)...');
    console.log('🎯 Players da aggiornare:', [...teamA, ...teamB]);
    console.log('📊 PlayerStats ricevuti:', playerStats);
    
    const allPlayers = [...teamA, ...teamB];
    
    for (const playerEmail of allPlayers) {
      try {
        console.log(`\n🔍 Processando statistiche base per ${playerEmail}...`);
        
        // Recupera le statistiche attuali del giocatore dalla tabella player_stats
        const existingStatsRecords = await base('player_stats').select({
          filterByFormula: `{playerEmail} = "${playerEmail}"`
        }).all();

        console.log(`📋 Record esistenti trovati per ${playerEmail}:`, existingStatsRecords.length);

        // Statistiche della partita per questo giocatore
        const matchStats = playerStats[playerEmail] || { gol: 0, assist: 0, gialli: 0, rossi: 0 };
        console.log(`⚽ Statistiche partita per ${playerEmail}:`, matchStats);
        
        // Determina se ha vinto, perso o pareggiato
        const playerTeam = teamA.includes(playerEmail) ? 'A' : 'B';
        const isWin = !isDraw && ((playerTeam === 'A' && teamAWins) || (playerTeam === 'B' && !teamAWins));
        const isLoss = !isDraw && !isWin;
        console.log(`🏆 ${playerEmail} - Team: ${playerTeam}, Win: ${isWin}, Loss: ${isLoss}, Draw: ${isDraw}`);

        if (existingStatsRecords.length > 0) {
          // Aggiorna record esistente
          const existingRecord = existingStatsRecords[0];
          const currentStats = {
            gol: Number(existingRecord.get('Gol')) || 0,
            partiteDisputate: Number(existingRecord.get('partiteDisputate')) || 0,
            partiteVinte: Number(existingRecord.get('partiteVinte')) || 0,
            partitePareggiate: Number(existingRecord.get('partitePareggiate')) || 0,
            partitePerse: Number(existingRecord.get('partitePerse')) || 0,
            assistenze: Number(existingRecord.get('assistenze')) || 0,
            cartelliniGialli: Number(existingRecord.get('cartelliniGialli')) || 0,
            cartelliniRossi: Number(existingRecord.get('cartelliniRossi')) || 0
          };
          console.log(`📊 Statistiche attuali per ${playerEmail}:`, currentStats);

          const updatedStats = {
            Gol: currentStats.gol + (matchStats.gol || 0),
            partiteDisputate: currentStats.partiteDisputate + 1,
            partiteVinte: currentStats.partiteVinte + (isWin ? 1 : 0),
            partitePareggiate: currentStats.partitePareggiate + (isDraw ? 1 : 0),
            partitePerse: currentStats.partitePerse + (isLoss ? 1 : 0),
            assistenze: currentStats.assistenze + (matchStats.assist || 0),
            cartelliniGialli: currentStats.cartelliniGialli + (matchStats.gialli || 0),
            cartelliniRossi: currentStats.cartelliniRossi + (matchStats.rossi || 0)
          };
          console.log(`🔄 Aggiornamento statistiche per ${playerEmail}:`, updatedStats);

          await base('player_stats').update(existingRecord.id, updatedStats);
          console.log(`✅ Statistiche aggiornate per ${playerEmail}:`, updatedStats);
          
        } else {
          // Crea nuovo record
          const newStats = {
            playerEmail: playerEmail,
            Gol: matchStats.gol || 0,
            partiteDisputate: 1,
            partiteVinte: isWin ? 1 : 0,
            partitePareggiate: isDraw ? 1 : 0,
            partitePerse: isLoss ? 1 : 0,
            assistenze: matchStats.assist || 0,
            cartelliniGialli: matchStats.gialli || 0,
            cartelliniRossi: matchStats.rossi || 0
          };
          console.log(`🆕 Creazione nuovo record per ${playerEmail}:`, newStats);

          const createdRecord = await base('player_stats').create(newStats);
          console.log(`✅ Nuove statistiche create per ${playerEmail}:`, createdRecord.fields);
        }

      } catch (error) {
        console.error(`❌ Errore nell'aggiornamento statistiche per ${playerEmail}:`, error);
        // Continua con gli altri giocatori
      }
    }

    // 5.5. ✅ CONTROLLO MILESTONE ACHIEVEMENTS (DOPO aggiornamento statistiche)
    console.log('🎯 Controllo milestone achievements con statistiche aggiornate...');
    
    try {
      // Recupera tutte le condizioni milestone dalla tabella special_cards
      const specialCardsRecords = await base('special_cards').select({
        filterByFormula: `AND({is_active} = TRUE(), {condition_type} = "player_stats", {ranking_behavior} = "threshold_met")`
      }).all();
      
      console.log(`Trovate ${specialCardsRecords.length} milestone da controllare`);
      
      // Per ogni giocatore della partita, controlla le milestone
      for (const playerEmail of allPlayers) {
        console.log(`🔍 Controllo milestone per ${playerEmail}`);
        
        // Recupera le statistiche AGGIORNATE del giocatore
        const playerStatsRecords = await base('player_stats').select({
          filterByFormula: `{playerEmail} = "${playerEmail}"`
        }).all();
        
        if (playerStatsRecords.length === 0) {
          console.log(`⚠️ Statistiche non trovate per ${playerEmail}`);
          continue;
        }
        
        const playerStatsRecord = playerStatsRecords[0];
        
        // Controlla ogni milestone
        for (const milestoneRecord of specialCardsRecords) {
          const templateId = milestoneRecord.get('template_id') as string;
          const conditionField = milestoneRecord.get('condition_field') as string;
          const conditionValue = Number(milestoneRecord.get('condition_value')) || 0;
          
          console.log(`📊 Controllo ${templateId}: ${conditionField} >= ${conditionValue}`);
          
          // Ottieni il valore AGGIORNATO della statistica
          const currentValue = Number(playerStatsRecord.get(conditionField)) || 0;
          
          console.log(`📈 ${playerEmail}: ${conditionField} = ${currentValue}`);
          
          // Verifica se la milestone è raggiunta
          if (currentValue >= conditionValue) {
            console.log(`🎉 Milestone raggiunta! ${playerEmail} ha sbloccato ${templateId}`);
            
            // Verifica se il giocatore ha già questa card
            const existingMilestone = await base('player_awards').select({
              filterByFormula: `AND({player_email} = "${playerEmail}", {award_type} = "${templateId}")`
            }).all();
            
            if (existingMilestone.length === 0) {
              // Assegna la milestone
              await base('player_awards').create({
                player_email: playerEmail,
                award_type: templateId,
                match_id: matchId,
                status: 'pending',
                unlocked_at: '',
                selected: false
              });
              
              // Aggiungi la milestone agli awards per il riepilogo
              awards.push({
                playerEmail: playerEmail,
                awardType: templateId,
                matchId: matchId
              });
              
              console.log(`✅ Milestone ${templateId} assegnata a ${playerEmail}`);
            } else {
              console.log(`⚠️ ${playerEmail} ha già la milestone ${templateId}`);
            }
          } else {
            console.log(`❌ Milestone non raggiunta: ${currentValue} < ${conditionValue}`);
          }
        }
      }
      
    } catch (milestoneError) {
      console.error('❌ Errore nel controllo milestone:', milestoneError);
      // Non blocca il processo, continua con l'impostazione votazioni
    }

    // 6. ✅ IMPOSTA TIMESTAMP PER VOTAZIONI (nuovo campo per tracking)
    try {
      await base('matches').update(match.id, {
        voting_started_at: new Date().toISOString(),
        voting_status: 'open'
      });
      console.log('🗳️ Timestamp votazioni impostato');
    } catch (error) {
      console.log('⚠️ Errore nell\'impostare timestamp votazioni (campo potrebbe non esistere):', error);
    }

    console.log('🏁 FASE 1 completata: premi immediate assegnati e statistiche base aggiornate!');
    console.log('🗳️ PROSSIMO: Le votazioni sono ora aperte. MOTM e abilità saranno processati dopo la chiusura.');

    return NextResponse.json({
      success: true,
      message: isReprocessing ? 'Partita aggiornata - premi immediate corretti' : 'FASE 1: Premi immediate assegnati e statistiche base aggiornate',
      phase: 1,
      awards: awards.length,
      awardDetails: awards,
      playersUpdated: allPlayers.length,
      playerStatsUpdated: true,
      playerAbilitiesUpdated: 0, // Saranno aggiornate in FASE 2
      votingOpen: true,
      nextPhase: 'Votazioni aperte - MOTM e abilità processati dopo chiusura',
      isReprocessing: isReprocessing,
      operation: isReprocessing ? 'update' : 'create'
    });

  } catch (error) {
    console.error('❌ Errore nel processare FASE 1:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel processare premi immediate e statistiche base',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 