import { supabase } from './supabase';
import { getMatchByMatchId, getMatchPlayerStats } from './matches';
import { processMatchVotesToPlayerStats, cleanupMatchVotes } from './voteAggregation';

// Algoritmo Fair Graduale v1.3 - Bilanciamento Avanzato (porting 1:1 da backend/matches/[id]/finalize-voting)
function calculateStatChange(currentOverall: number, baseChange: number, netVotes: number): number {
  const voteBonus = netVotes * 0.095;
  const totalChange = baseChange + voteBonus;

  const MEDIA = 83.95;
  const MIN_OVERALL = 56;
  const MAX_OVERALL = 99;

  const distanceFromMean = (currentOverall - MEDIA) / (MAX_OVERALL - MIN_OVERALL);

  let multiplier = 1.0;

  if (totalChange > 0) {
    multiplier = 1.0 - distanceFromMean * 0.5;
  } else {
    multiplier = 1.0 + distanceFromMean * 0.7;
  }

  return totalChange * multiplier;
}

export async function checkVotingClosed(matchId: string): Promise<{ closed: boolean; reason: string }> {
  const match = await getMatchByMatchId(matchId);

  if (!match) {
    return { closed: false, reason: 'Partita non trovata' };
  }

  const allPlayers = [...match.team_a, ...match.team_b];

  if (match.finalized) {
    return { closed: true, reason: 'Partita finalizzata (voti aggregati)' };
  }

  if (match.voting_started_at) {
    const startTime = new Date(match.voting_started_at).getTime();
    const now = Date.now();
    const hours24 = 24 * 60 * 60 * 1000;

    if (now - startTime > hours24) {
      return { closed: true, reason: '24 ore trascorse - chiusura automatica' };
    }
  }

  const { data: voteRecords, error } = await supabase
    .from('votes')
    .select('from_player_id')
    .eq('match_id', matchId);

  if (error) {
    console.error('Errore nel controllo chiusura votazioni:', error);
    return { closed: false, reason: 'Errore nel controllo' };
  }

  const uniqueVoters = new Set((voteRecords || []).map((v) => v.from_player_id as string));
  const playersVoted = allPlayers.filter((email) => uniqueVoters.has(email));

  if (playersVoted.length === allPlayers.length) {
    return { closed: true, reason: 'Tutti i giocatori hanno votato' };
  }

  return { closed: false, reason: `${playersVoted.length}/${allPlayers.length} giocatori hanno votato` };
}

export interface FinalizeVotingResult {
  success: boolean;
  error?: string;
  reason?: string;
  status?: string;
  message?: string;
  motmAwards?: number;
  motmDetails?: Array<{ playerEmail: string; awardType: string; matchId: string }>;
  playerAbilitiesUpdated?: number;
  statUpdates?: Array<{ email: string; changes: Record<string, number> }>;
  voteStats?: Record<string, { up: number; down: number; neutral: number; net: number; motm: number }>;
  votingCloseReason?: string;
  voteAggregationSuccess?: boolean;
}

export async function finalizeVoting(matchId: string, options: { force?: boolean } = {}): Promise<FinalizeVotingResult> {
  const isForced = options.force === true;

  let votingStatus: { closed: boolean; reason: string };
  if (!isForced) {
    votingStatus = await checkVotingClosed(matchId);
    if (!votingStatus.closed) {
      return { success: false, error: 'Votazioni ancora aperte', reason: votingStatus.reason, status: 'waiting' };
    }
  } else {
    votingStatus = { closed: true, reason: "Finalizzazione forzata dall'admin" };
  }

  const match = await getMatchByMatchId(matchId);
  if (!match) {
    return { success: false, error: 'Partita non trovata' };
  }

  const teamA = match.team_a;
  const teamB = match.team_b;
  const scoreA = match.score_a || 0;
  const scoreB = match.score_b || 0;
  const isDraw = scoreA === scoreB;
  const teamAWins = scoreA > scoreB;

  const { data: voteRecords, error: voteError } = await supabase
    .from('votes')
    .select('to_player_id, vote_type, motm_vote')
    .eq('match_id', matchId);

  if (voteError) {
    return { success: false, error: 'Errore nel recupero voti', reason: voteError.message };
  }

  const voteStats: Record<string, { up: number; down: number; neutral: number; net: number; motm: number }> = {};

  (voteRecords || []).forEach((vote) => {
    const playerEmail = vote.to_player_id as string;
    const voteType = vote.vote_type as string;
    const motmVote = vote.motm_vote as boolean;

    if (!voteStats[playerEmail]) {
      voteStats[playerEmail] = { up: 0, down: 0, neutral: 0, net: 0, motm: 0 };
    }

    if (voteType === 'UP') voteStats[playerEmail].up++;
    else if (voteType === 'DOWN') voteStats[playerEmail].down++;
    else if (voteType === 'NEUTRAL') voteStats[playerEmail].neutral++;

    if (motmVote) voteStats[playerEmail].motm++;

    voteStats[playerEmail].net = voteStats[playerEmail].up - voteStats[playerEmail].down;
  });

  // MOTM: assegna a chi ha più voti MOTM, con gestione pareggi (squadra vincente ha priorità)
  const motmAwards: Array<{ playerEmail: string; awardType: string; matchId: string }> = [];

  const sortedByMOTM = Object.entries(voteStats)
    .sort(([, a], [, b]) => b.motm - a.motm)
    .filter(([email]) => [...teamA, ...teamB].includes(email))
    .filter(([, stats]) => stats.motm > 0);

  if (sortedByMOTM.length > 0) {
    const [topPlayerEmail, topPlayerVotes] = sortedByMOTM[0];
    const tied = sortedByMOTM.filter(([, votes]) => votes.motm === topPlayerVotes.motm);

    if (tied.length === 1) {
      motmAwards.push({ playerEmail: topPlayerEmail, awardType: 'motm', matchId });
    } else {
      const tiedFromWinningTeam = tied.filter(
        ([email]) => !isDraw && ((teamAWins && teamA.includes(email)) || (!teamAWins && teamB.includes(email)))
      );

      if (tiedFromWinningTeam.length > 0) {
        tiedFromWinningTeam.forEach(([email]) => motmAwards.push({ playerEmail: email, awardType: 'motm', matchId }));
      } else {
        tied.forEach(([email]) => motmAwards.push({ playerEmail: email, awardType: 'motm', matchId }));
      }
    }
  }

  if (motmAwards.length > 0) {
    for (const award of motmAwards) {
      const { data: existingMOTM } = await supabase
        .from('player_awards')
        .select('id')
        .eq('player_email', award.playerEmail)
        .eq('award_type', 'motm')
        .eq('match_id', matchId);

      if (!existingMOTM || existingMOTM.length === 0) {
        await supabase.from('player_awards').insert({
          player_email: award.playerEmail,
          award_type: award.awardType,
          match_id: award.matchId,
          status: 'pending',
        });
      }
    }
  }

  // Aggiorna abilità giocatori con l'Algoritmo Fair
  const allPlayers = [...teamA, ...teamB];
  const statUpdates: Array<{ email: string; changes: Record<string, number> }> = [];

  for (const playerEmail of allPlayers) {
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('email', playerEmail)
      .maybeSingle();

    if (playerError || !player) {
      console.log(`Giocatore ${playerEmail} non trovato in tabella players`);
      continue;
    }

    const currentStats = {
      ATT: Number(player.attacco) || 50,
      DIF: Number(player.difesa) || 50,
      VEL: Number(player.velocita) || 50,
      PAS: Number(player.passaggio) || 50,
      FOR: Number(player.forza) || 50,
      POR: Number(player.portiere) || 50,
    };

    const statValues = Object.values(currentStats);
    const top5Stats = statValues.sort((a, b) => b - a).slice(0, 5);
    const currentOverall = top5Stats.reduce((sum, val) => sum + val, 0) / 5;

    const playerTeam = teamA.includes(playerEmail) ? 'A' : 'B';
    let baseChange = 0;

    if (!isDraw) {
      if ((playerTeam === 'A' && teamAWins) || (playerTeam === 'B' && !teamAWins)) {
        baseChange = 0.25;
      } else {
        baseChange = -0.25;
      }
    }

    const netVotes = voteStats[playerEmail]?.net || 0;
    const totalChange = calculateStatChange(currentOverall, baseChange, netVotes);

    const fieldMap: Record<string, string> = {
      ATT: 'attacco',
      DIF: 'difesa',
      VEL: 'velocita',
      PAS: 'passaggio',
      FOR: 'forza',
      POR: 'portiere',
    };

    const newStats: Record<string, number> = {};
    const changes: Record<string, number> = {};
    Object.entries(currentStats).forEach(([stat, value]) => {
      const newValue = Math.max(1.0, Math.min(99.0, value + totalChange));
      const rounded = Math.round(newValue * 10) / 10;
      newStats[fieldMap[stat]] = rounded;
      changes[stat] = Math.round((rounded - value) * 1000) / 1000;
    });

    await supabase.from('players').update(newStats).eq('email', playerEmail);

    statUpdates.push({ email: playerEmail, changes });
  }

  await supabase
    .from('matches')
    .update({
      voting_status: 'closed',
      voting_closed_at: new Date().toISOString(),
      voting_close_reason: votingStatus.reason,
      finalized: true,
    })
    .eq('match_id', matchId);

  let voteAggregationSuccess = false;
  try {
    await processMatchVotesToPlayerStats(matchId);
    await cleanupMatchVotes(matchId);
    voteAggregationSuccess = true;
  } catch (aggregationError) {
    console.error("Errore nell'aggregazione voti:", aggregationError);
  }

  return {
    success: true,
    message: voteAggregationSuccess
      ? 'Votazioni finalizzate - MOTM assegnato, abilità aggiornate e voti aggregati'
      : 'Votazioni finalizzate - MOTM assegnato e abilità aggiornate (aggregazione voti fallita)',
    motmAwards: motmAwards.length,
    motmDetails: motmAwards,
    playerAbilitiesUpdated: statUpdates.length,
    statUpdates,
    voteStats,
    votingCloseReason: votingStatus.reason,
    voteAggregationSuccess,
  };
}

export interface ProcessAwardsResult {
  success: boolean;
  error?: string;
  message?: string;
  awards?: number;
  awardDetails?: Array<{ playerEmail: string; awardType: string; matchId: string }>;
  playersUpdated?: number;
  isReprocessing?: boolean;
}

export async function processAwards(matchId: string): Promise<ProcessAwardsResult> {
  // Controllo aggiornamento sicuro: se la partita è già stata processata, sottrai le vecchie statistiche prima di ricalcolare
  const { data: existingAwards } = await supabase
    .from('player_awards')
    .select('*')
    .eq('match_id', matchId);

  let isReprocessing = false;

  const match = await getMatchByMatchId(matchId);
  if (!match) {
    return { success: false, error: 'Partita non trovata' };
  }

  if (existingAwards && existingAwards.length > 0) {
    isReprocessing = true;

    const oldPlayerStats = await getMatchPlayerStats(matchId);

    const immediateAwards = existingAwards.filter((award) => award.award_type !== 'motm');
    if (immediateAwards.length > 0) {
      await supabase
        .from('player_awards')
        .delete()
        .in('id', immediateAwards.map((a) => a.id));
    }

    const oldTeamA = match.team_a;
    const oldTeamB = match.team_b;
    const oldAllPlayers = [...oldTeamA, ...oldTeamB];
    const oldScoreA = match.score_a || 0;
    const oldScoreB = match.score_b || 0;
    const oldIsDraw = oldScoreA === oldScoreB;
    const oldTeamAWins = oldScoreA > oldScoreB;

    for (const playerEmail of oldAllPlayers) {
      const { data: existingRecord } = await supabase
        .from('player_stats')
        .select('*')
        .eq('player_email', playerEmail)
        .maybeSingle();

      if (existingRecord) {
        const oldPlayerTeam = oldTeamA.includes(playerEmail) ? 'A' : 'B';
        const oldIsWin = !oldIsDraw && ((oldPlayerTeam === 'A' && oldTeamAWins) || (oldPlayerTeam === 'B' && !oldTeamAWins));
        const oldIsLoss = !oldIsDraw && !oldIsWin;

        const oldMatchStats = oldPlayerStats[playerEmail] || { gol: 0, assist: 0, gialli: 0, rossi: 0 };

        await supabase
          .from('player_stats')
          .update({
            gol: Math.max(0, existingRecord.gol - (oldMatchStats.gol || 0)),
            partite_disputate: Math.max(0, existingRecord.partite_disputate - 1),
            partite_vinte: Math.max(0, existingRecord.partite_vinte - (oldIsWin ? 1 : 0)),
            partite_pareggiate: Math.max(0, existingRecord.partite_pareggiate - (oldIsDraw ? 1 : 0)),
            partite_perse: Math.max(0, existingRecord.partite_perse - (oldIsLoss ? 1 : 0)),
            assistenze: Math.max(0, existingRecord.assistenze - (oldMatchStats.assist || 0)),
            cartellini_gialli: Math.max(0, existingRecord.cartellini_gialli - (oldMatchStats.gialli || 0)),
            cartellini_rossi: Math.max(0, existingRecord.cartellini_rossi - (oldMatchStats.rossi || 0)),
          })
          .eq('player_email', playerEmail);
      }
    }
  }

  const playerStats = await getMatchPlayerStats(matchId);
  const teamA = match.team_a;
  const teamB = match.team_b;
  const scoreA = match.score_a || 0;
  const scoreB = match.score_b || 0;
  const isDraw = scoreA === scoreB;
  const teamAWins = scoreA > scoreB;

  const awards: Array<{ playerEmail: string; awardType: string; matchId: string }> = [];

  // Goleador/Assistman ecc. sono ora milestone su statistiche cumulative (vedi sotto), non premi immediati.

  const allPlayers = [...teamA, ...teamB];

  for (const playerEmail of allPlayers) {
    const matchStats = playerStats[playerEmail] || { gol: 0, assist: 0, gialli: 0, rossi: 0 };
    const playerTeam = teamA.includes(playerEmail) ? 'A' : 'B';
    const isWin = !isDraw && ((playerTeam === 'A' && teamAWins) || (playerTeam === 'B' && !teamAWins));
    const isLoss = !isDraw && !isWin;

    const { data: existingRecord } = await supabase
      .from('player_stats')
      .select('*')
      .eq('player_email', playerEmail)
      .maybeSingle();

    if (existingRecord) {
      await supabase
        .from('player_stats')
        .update({
          gol: existingRecord.gol + (matchStats.gol || 0),
          partite_disputate: existingRecord.partite_disputate + 1,
          partite_vinte: existingRecord.partite_vinte + (isWin ? 1 : 0),
          partite_pareggiate: existingRecord.partite_pareggiate + (isDraw ? 1 : 0),
          partite_perse: existingRecord.partite_perse + (isLoss ? 1 : 0),
          assistenze: existingRecord.assistenze + (matchStats.assist || 0),
          cartellini_gialli: existingRecord.cartellini_gialli + (matchStats.gialli || 0),
          cartellini_rossi: existingRecord.cartellini_rossi + (matchStats.rossi || 0),
          updated_at: new Date().toISOString(),
        })
        .eq('player_email', playerEmail);
    } else {
      await supabase.from('player_stats').insert({
        player_email: playerEmail,
        gol: matchStats.gol || 0,
        partite_disputate: 1,
        partite_vinte: isWin ? 1 : 0,
        partite_pareggiate: isDraw ? 1 : 0,
        partite_perse: isLoss ? 1 : 0,
        assistenze: matchStats.assist || 0,
        cartellini_gialli: matchStats.gialli || 0,
        cartellini_rossi: matchStats.rossi || 0,
      });
    }
  }

  // Controllo milestone achievement con le statistiche appena aggiornate
  const { data: specialCardsRecords } = await supabase
    .from('special_cards')
    .select('*')
    .eq('is_active', true)
    .eq('condition_type', 'player_stats')
    .eq('ranking_behavior', 'threshold_met');

  const conditionFieldToColumn: Record<string, string> = {
    Gol: 'gol',
    gol: 'gol',
    assistenze: 'assistenze',
    partiteVinte: 'partite_vinte',
    partiteDisputate: 'partite_disputate',
  };

  for (const playerEmail of allPlayers) {
    const { data: playerStatsRecord } = await supabase
      .from('player_stats')
      .select('*')
      .eq('player_email', playerEmail)
      .maybeSingle();

    if (!playerStatsRecord) continue;

    for (const milestone of specialCardsRecords || []) {
      const templateId = milestone.template_id as string;
      const conditionField = milestone.condition_field as string;
      const conditionValue = Number(milestone.condition_value) || 0;
      const column = conditionFieldToColumn[conditionField] || conditionField;

      const currentValue = Number((playerStatsRecord as Record<string, unknown>)[column]) || 0;

      if (currentValue >= conditionValue) {
        const { data: existingMilestone } = await supabase
          .from('player_awards')
          .select('id')
          .eq('player_email', playerEmail)
          .eq('award_type', templateId);

        if (!existingMilestone || existingMilestone.length === 0) {
          await supabase.from('player_awards').insert({
            player_email: playerEmail,
            award_type: templateId,
            match_id: matchId,
            status: 'pending',
          });

          awards.push({ playerEmail, awardType: templateId, matchId });
        }
      }
    }
  }

  await supabase
    .from('matches')
    .update({ voting_started_at: new Date().toISOString(), voting_status: 'open' })
    .eq('match_id', matchId);

  return {
    success: true,
    message: isReprocessing ? 'Partita aggiornata - premi immediate corretti' : 'Premi immediate assegnati e statistiche base aggiornate',
    awards: awards.length,
    awardDetails: awards,
    playersUpdated: allPlayers.length,
    isReprocessing,
  };
}

export interface TimeoutCheckResult {
  success: boolean;
  error?: string;
  autoFinalized?: boolean;
  timeout?: boolean;
  alreadyClosed?: boolean;
  hoursElapsed?: number;
  hoursRemaining?: number;
  votingStatus?: string;
  motmAwarded?: number;
  abilitiesUpdated?: number;
}

export async function checkVotingTimeout(matchId: string): Promise<TimeoutCheckResult> {
  const match = await getMatchByMatchId(matchId);
  if (!match) {
    return { success: false, error: 'Partita non trovata' };
  }

  if (match.voting_status === 'closed') {
    return { success: true, alreadyClosed: true, votingStatus: 'closed' };
  }

  if (!match.voting_started_at) {
    return { success: false, error: 'Timestamp inizio votazioni non trovato' };
  }

  const startTime = new Date(match.voting_started_at).getTime();
  const now = Date.now();
  const hours24 = 24 * 60 * 60 * 1000;
  const timeElapsed = now - startTime;
  const hoursElapsed = timeElapsed / (60 * 60 * 1000);

  if (timeElapsed <= hours24) {
    const remainingHours = Math.max(0, 24 - hoursElapsed);
    return {
      success: true,
      timeout: false,
      hoursElapsed: Math.round(hoursElapsed * 10) / 10,
      hoursRemaining: Math.round(remainingHours * 10) / 10,
      votingStatus: 'open',
    };
  }

  const finalizeResult = await finalizeVoting(matchId);

  if (finalizeResult.success) {
    return {
      success: true,
      timeout: true,
      hoursElapsed: Math.round(hoursElapsed * 10) / 10,
      autoFinalized: true,
      motmAwarded: finalizeResult.motmAwards || 0,
      abilitiesUpdated: finalizeResult.playerAbilitiesUpdated || 0,
    };
  }

  return {
    success: false,
    error: 'Timeout raggiunto ma finalizzazione fallita',
    timeout: true,
    hoursElapsed: Math.round(hoursElapsed * 10) / 10,
  };
}
