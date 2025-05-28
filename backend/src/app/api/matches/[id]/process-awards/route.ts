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
  const voteBonus = netVotes * 0.1; // Range: -0.9 a +0.9
  const totalChange = baseChange + voteBonus;
  
  // Moltiplicatore Fair basato sull'overall
  let multiplier = 1.0;
  if (currentOverall < 50) {
    multiplier = totalChange > 0 ? 1.3 : 0.8; // +30% salita, -20% discesa
  } else if (currentOverall < 70) {
    multiplier = totalChange > 0 ? 1.1 : 0.9; // +10% salita, -10% discesa
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
      filterByFormula: `{id} = "${matchId}"`
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
    const result = match.get('risultato') as string || '0-0';
    
    // 2. Determina la squadra vincente
    const [scoreA, scoreB] = result.split('-').map(Number);
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
      .map(([email, stats]: [string, any]) => ({ email, goals: stats.goals || 0 }))
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
      .map(([email, stats]: [string, any]) => ({ email, assists: stats.assists || 0 }))
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

    // 7. Aggiorna le statistiche dei giocatori
    const allPlayers = [...teamA, ...teamB];
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
        ATT: Number(player.get('ATT')) || 50,
        DIF: Number(player.get('DIF')) || 50,
        VEL: Number(player.get('VEL')) || 50,
        PAS: Number(player.get('PAS')) || 50,
        FOR: Number(player.get('FOR')) || 50,
        POR: Number(player.get('POR')) || 50
      };

      const currentOverall = (currentStats.ATT + currentStats.DIF + currentStats.VEL + 
                             currentStats.PAS + currentStats.FOR + currentStats.POR) / 6;

      // Calcola cambiamento base (vittoria/sconfitta)
      const playerTeam = teamA.includes(playerEmail) ? 'A' : 'B';
      let baseChange = 0;
      
      if (!isDraw) {
        if ((playerTeam === 'A' && teamAWins) || (playerTeam === 'B' && !teamAWins)) {
          baseChange = 0.5; // Vittoria
        } else {
          baseChange = -0.5; // Sconfitta
        }
      }

      // Calcola cambiamento con algoritmo fair
      const netVotes = voteStats[playerEmail]?.net || 0;
      const totalChange = calculateStatChange(currentOverall, baseChange, netVotes);

      // Applica i cambiamenti
      const newStats = {} as Record<string, number>;
      Object.entries(currentStats).forEach(([stat, value]) => {
        const newValue = Math.max(1.0, Math.min(99.0, value + totalChange));
        newStats[stat] = Math.round(newValue * 10) / 10; // Arrotonda a 1 decimale
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

    console.log('Statistiche aggiornate per', statUpdates.length, 'giocatori');

    return NextResponse.json({
      success: true,
      message: 'Premi e statistiche processati con successo',
      awards: awards.length,
      awardDetails: awards,
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