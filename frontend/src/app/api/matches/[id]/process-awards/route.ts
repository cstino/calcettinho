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

// Algoritmo Fair per evoluzione statistiche
function calculateStatChange(currentOverall: number, baseChange: number, netVotes: number): number {
  const voteBonus = netVotes * 0.02; // Ridotto da 0.05 a 0.02 (Range: -0.18 a +0.18)
  const totalChange = baseChange + voteBonus;
  
  // Moltiplicatore Fair basato sull'overall (molto ridotto)
  let multiplier = 1.0;
  if (currentOverall < 50) {
    multiplier = totalChange > 0 ? 1.1 : 0.95; // Ridotto da 1.15/0.9 a 1.1/0.95
  } else if (currentOverall < 70) {
    multiplier = totalChange > 0 ? 1.02 : 0.98; // Ridotto da 1.05/0.95 a 1.02/0.98
  }
  // Overall >= 70: normale (1.0)
  
  return totalChange * multiplier;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;
    
    console.log('Processando premi per partita:', matchId);

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
    
    // 3. Recupera tutti i voti per questa partita
    const voteRecords = await base('votes').select({
      filterByFormula: `{matchId} = "${matchId}"`
    }).all();

    // 4. Calcola statistiche UP/DOWN per ogni giocatore
    const voteStats = {} as Record<string, { up: number; down: number; net: number }>;
    
    voteRecords.forEach(vote => {
      const playerEmail = vote.get('toPlayerId') as string;
      const voteType = vote.get('voteType') as string;
      
      if (!voteStats[playerEmail]) {
        voteStats[playerEmail] = { up: 0, down: 0, net: 0 };
      }
      
      if (voteType === 'UP') {
        voteStats[playerEmail].up++;
      } else {
        voteStats[playerEmail].down++;
      }
      
      voteStats[playerEmail].net = voteStats[playerEmail].up - voteStats[playerEmail].down;
    });

    // 5. Calcola i premi post-partita
    const awards = [] as Array<{
      playerEmail: string;
      awardType: string;
      matchId: string;
    }>;

    // Man of the Match (più UP ricevuti)
    const sortedByUP = Object.entries(voteStats)
      .sort(([,a], [,b]) => b.up - a.up)
      .filter(([email]) => [...teamA, ...teamB].includes(email));

    if (sortedByUP.length > 0) {
      const [topPlayerEmail, topPlayerVotes] = sortedByUP[0];
      const tied = sortedByUP.filter(([,votes]) => votes.up === topPlayerVotes.up);
      
      if (tied.length === 1) {
        // Un solo vincitore
        awards.push({
          playerEmail: topPlayerEmail,
          awardType: 'motm',
          matchId
        });
      } else {
        // Pareggio - decide la squadra vincente o entrambi se stessa squadra
        const tiedFromWinningTeam = tied.filter(([email]) => 
          !isDraw && ((teamAWins && teamA.includes(email)) || (!teamAWins && teamB.includes(email)))
        );
        
        if (tiedFromWinningTeam.length > 0) {
          // Vince chi è nella squadra vincente
          tiedFromWinningTeam.forEach(([email]) => {
            awards.push({
              playerEmail: email,
              awardType: 'motm',
              matchId
            });
          });
        } else {
          // Stessa squadra o pareggio - tutti vincono
          tied.forEach(([email]) => {
            awards.push({
              playerEmail: email,
              awardType: 'motm',
              matchId
            });
          });
        }
      }
    }

    // Goleador (più gol segnati)
    const goalScorers = Object.entries(playerStats)
      .map(([email, stats]: [string, any]) => ({ email, goals: stats.gol || 0 }))
      .filter(player => player.goals > 0)
      .sort((a, b) => b.goals - a.goals);

    if (goalScorers.length > 0 && goalScorers[0].goals > 0) {
      const topScorer = goalScorers[0];
      const tiedScorers = goalScorers.filter(p => p.goals === topScorer.goals);
      
      tiedScorers.forEach(scorer => {
        awards.push({
          playerEmail: scorer.email,
          awardType: 'goleador',
          matchId
        });
      });
    }

    // Assist Man (più assist forniti)
    const assistProviders = Object.entries(playerStats)
      .map(([email, stats]: [string, any]) => ({ email, assists: stats.assist || 0 }))
      .filter(player => player.assists > 0)
      .sort((a, b) => b.assists - a.assists);

    if (assistProviders.length > 0 && assistProviders[0].assists > 0) {
      const topAssist = assistProviders[0];
      const tiedAssists = assistProviders.filter(p => p.assists === topAssist.assists);
      
      tiedAssists.forEach(provider => {
        awards.push({
          playerEmail: provider.email,
          awardType: 'assistman',
          matchId
        });
      });
    }

    // 6. Salva i premi nella tabella player_awards
    if (awards.length > 0) {
      try {
        for (const award of awards) {
          await base('player_awards').create({
            player_email: award.playerEmail,
            award_type: award.awardType,
            match_id: award.matchId,
            status: 'pending',
            unlocked_at: '',
            selected: false
          });
        }
        console.log('Premi salvati:', awards.length);
      } catch (error) {
        console.error('Errore nel salvare premi:', error);
        // Continua comunque con l'aggiornamento statistiche
      }
    }

    // 7. Aggiorna le statistiche dei giocatori nella tabella player_stats
    console.log('🔄 Aggiornamento tabella player_stats...');
    console.log('🎯 Players da aggiornare:', [...teamA, ...teamB]);
    console.log('📊 PlayerStats ricevuti:', playerStats);
    
    const allPlayers = [...teamA, ...teamB];
    
    for (const playerEmail of allPlayers) {
      try {
        console.log(`\n🔍 Processando ${playerEmail}...`);
        
        // Recupera le statistiche attuali del giocatore dalla tabella player_stats
        const existingStatsRecords = await base('player_stats').select({
          filterByFormula: `{playerEmail} = "${playerEmail}"`
        }).all();

        console.log(`📋 Record esistenti trovati per ${playerEmail}:`, existingStatsRecords.length);
        if (existingStatsRecords.length > 0) {
          console.log('📋 Primo record esistente:', existingStatsRecords[0].fields);
        }

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
        if (error instanceof Error) {
          console.error(`❌ Dettagli errore: ${error.message}`);
          console.error(`❌ Stack: ${error.stack}`);
        }
        // Continua con gli altri giocatori
      }
    }

    // 8. Aggiorna le abilità dei giocatori nella tabella players
    const statUpdates = [] as Array<{
      email: string;
      changes: Record<string, number>;
    }>;

    for (const playerEmail of allPlayers) {
      // Recupera statistiche attuali
      const playerRecords = await base('players').select({
        filterByFormula: `{email} = "${playerEmail}"`
      }).all();

      if (playerRecords.length === 0) continue;

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

      // Calcola cambiamento base (vittoria/sconfitta)
      const playerTeam = teamA.includes(playerEmail) ? 'A' : 'B';
      let baseChange = 0;
      
      if (!isDraw) {
        if ((playerTeam === 'A' && teamAWins) || (playerTeam === 'B' && !teamAWins)) {
          baseChange = 0.083; // ~+1 overall ogni 2 vittorie (0.083 * 2 * 6 stats ≈ 1 overall)
        } else {
          baseChange = -0.083; // Proporzionale perdita per sconfitta
        }
      }

      // Calcola cambiamento con algoritmo fair
      const netVotes = voteStats[playerEmail]?.net || 0;
      const totalChange = calculateStatChange(currentOverall, baseChange, netVotes);

      // Applica i cambiamenti
      const newStats = {} as Record<string, number>;
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
            newStats[stat] - oldVal
          ])
        )
      });
    }

    console.log('Statistiche abilità aggiornate per', statUpdates.length, 'giocatori');
    console.log('📊 Processo completato: premi assegnati e statistiche aggiornate!');

    return NextResponse.json({
      success: true,
      message: 'Premi e statistiche processati con successo',
      awards: awards.length,
      awardDetails: awards,
      playersUpdated: allPlayers.length,
      playerStatsUpdated: true,
      playerAbilitiesUpdated: statUpdates.length,
      statUpdates,
      voteStats
    });

  } catch (error) {
    console.error('Errore nel processare premi:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel processare premi e statistiche',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 