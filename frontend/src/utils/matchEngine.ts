import { supabase } from './supabase';
import { getMatchByMatchId, getMatchPlayerStats } from './matches';

/**
 * Motore di finalizzazione partita v3.
 *
 * Il vecchio "algoritmo Fair" (evoluzione delle abilità in players) non esiste più:
 * le stats sono calcolate da player_stats (vedi playerRating.ts). Qui si aggregano
 * i voti 1-10 (DIF/POR/MVP), si assegna il MOTM alla media MVP più alta, si
 * aggiornano i contatori dell'era ranked e si scrive lo snapshot match_ratings
 * prima di cancellare i votes (tabella transiente).
 */

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

interface PlayerRatingAgg {
  difSum: number;
  porSum: number;
  mvpSum: number;
  count: number;
}

export interface RatingStats {
  [email: string]: { difAvg: number; porAvg: number; mvpAvg: number; count: number };
}

export interface FinalizeVotingResult {
  success: boolean;
  error?: string;
  reason?: string;
  status?: string;
  message?: string;
  motmAwards?: number;
  motmDetails?: Array<{ playerEmail: string; awardType: string; matchId: string }>;
  playersUpdated?: number;
  ratingStats?: RatingStats;
  votingCloseReason?: string;
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
  const allPlayers = [...teamA, ...teamB];

  // 1. Aggrega i rating ricevuti da ogni giocatore
  const { data: voteRecords, error: voteError } = await supabase
    .from('votes')
    .select('to_player_id, dif_rating, por_rating, mvp_rating')
    .eq('match_id', matchId);

  if (voteError) {
    return { success: false, error: 'Errore nel recupero voti', reason: voteError.message };
  }

  const aggByPlayer: Record<string, PlayerRatingAgg> = {};
  (voteRecords || []).forEach((vote) => {
    const email = vote.to_player_id as string;
    if (!aggByPlayer[email]) {
      aggByPlayer[email] = { difSum: 0, porSum: 0, mvpSum: 0, count: 0 };
    }
    aggByPlayer[email].difSum += vote.dif_rating;
    aggByPlayer[email].porSum += vote.por_rating;
    aggByPlayer[email].mvpSum += vote.mvp_rating;
    aggByPlayer[email].count += 1;
  });

  const ratingStats: RatingStats = {};
  Object.entries(aggByPlayer).forEach(([email, agg]) => {
    ratingStats[email] = {
      difAvg: Math.round((agg.difSum / agg.count) * 100) / 100,
      porAvg: Math.round((agg.porSum / agg.count) * 100) / 100,
      mvpAvg: Math.round((agg.mvpSum / agg.count) * 100) / 100,
      count: agg.count,
    };
  });

  // 2. MOTM: media MVP più alta tra i partecipanti (confronto a 2 decimali).
  //    Pareggi: priorità alla squadra vincente, altrimenti premiati tutti i pari merito.
  const motmAwards: Array<{ playerEmail: string; awardType: string; matchId: string }> = [];

  const ranked = Object.entries(ratingStats)
    .filter(([email]) => allPlayers.includes(email))
    .sort(([, a], [, b]) => b.mvpAvg - a.mvpAvg);

  if (ranked.length > 0) {
    const topAvg = ranked[0][1].mvpAvg;
    const tied = ranked.filter(([, s]) => s.mvpAvg === topAvg);

    if (tied.length === 1) {
      motmAwards.push({ playerEmail: tied[0][0], awardType: 'motm', matchId });
    } else {
      const tiedFromWinningTeam = tied.filter(
        ([email]) => !isDraw && ((teamAWins && teamA.includes(email)) || (!teamAWins && teamB.includes(email)))
      );
      const winners = tiedFromWinningTeam.length > 0 ? tiedFromWinningTeam : tied;
      winners.forEach(([email]) => motmAwards.push({ playerEmail: email, awardType: 'motm', matchId }));
    }
  }

  const motmEmails = new Set(motmAwards.map((a) => a.playerEmail));

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

  // 3. Aggiorna player_stats: contatori era ranked + somme/conteggi rating.
  //    rk_* si incrementano SOLO qui: finalize è l'unico punto in cui la partita
  //    diventa definitiva, e numeratore/denominatore devono muoversi insieme.
  const matchPlayerStats = await getMatchPlayerStats(matchId);
  let playersUpdated = 0;

  for (const playerEmail of allPlayers) {
    const matchStats = matchPlayerStats[playerEmail] || { gol: 0, assist: 0, gialli: 0, rossi: 0 };
    const agg = aggByPlayer[playerEmail] || { difSum: 0, porSum: 0, mvpSum: 0, count: 0 };

    const { data: existing } = await supabase
      .from('player_stats')
      .select('rk_matches, rk_goals, rk_assists, dif_sum, dif_count, por_sum, por_count, mvp_sum, mvp_count')
      .eq('player_email', playerEmail)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from('player_stats')
        .update({
          rk_matches: existing.rk_matches + 1,
          rk_goals: existing.rk_goals + (matchStats.gol || 0),
          rk_assists: existing.rk_assists + (matchStats.assist || 0),
          dif_sum: existing.dif_sum + agg.difSum,
          dif_count: existing.dif_count + agg.count,
          por_sum: existing.por_sum + agg.porSum,
          por_count: existing.por_count + agg.count,
          mvp_sum: existing.mvp_sum + agg.mvpSum,
          mvp_count: existing.mvp_count + agg.count,
          updated_at: new Date().toISOString(),
        })
        .eq('player_email', playerEmail);
      if (!updateError) playersUpdated++;
    } else {
      const { error: insertError } = await supabase.from('player_stats').insert({
        player_email: playerEmail,
        rk_matches: 1,
        rk_goals: matchStats.gol || 0,
        rk_assists: matchStats.assist || 0,
        dif_sum: agg.difSum,
        dif_count: agg.count,
        por_sum: agg.porSum,
        por_count: agg.count,
        mvp_sum: agg.mvpSum,
        mvp_count: agg.count,
      });
      if (!insertError) playersUpdated++;
    }
  }

  // 4. Snapshot match_ratings (PRIMA del cleanup votes: è l'unico storico per-partita)
  const ratingRows = Object.entries(ratingStats).map(([email, s]) => ({
    match_id: matchId,
    player_email: email,
    dif_avg: s.difAvg,
    por_avg: s.porAvg,
    mvp_avg: s.mvpAvg,
    ratings_count: s.count,
    is_motm: motmEmails.has(email),
  }));

  if (ratingRows.length > 0) {
    const { error: snapshotError } = await supabase
      .from('match_ratings')
      .upsert(ratingRows, { onConflict: 'match_id,player_email' });
    if (snapshotError) {
      console.error('Errore nello snapshot match_ratings:', snapshotError);
    }
  }

  // 5. Chiudi la partita
  await supabase
    .from('matches')
    .update({
      voting_status: 'closed',
      voting_closed_at: new Date().toISOString(),
      voting_close_reason: votingStatus.reason,
      finalized: true,
    })
    .eq('match_id', matchId);

  // 6. Cleanup votes (transiente: lo storico vive in match_ratings + player_stats)
  const { error: cleanupError } = await supabase.from('votes').delete().eq('match_id', matchId);
  if (cleanupError) {
    console.error('Errore nella cancellazione voti:', cleanupError);
  }

  return {
    success: true,
    message: 'Votazioni finalizzate: MOTM assegnato, rating aggregati e snapshot salvato',
    motmAwards: motmAwards.length,
    motmDetails: motmAwards,
    playersUpdated,
    ratingStats,
    votingCloseReason: votingStatus.reason,
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
  // Controllo aggiornamento sicuro: se la partita è già stata processata, sottrai le
  // vecchie statistiche prima di ricalcolare
  const { data: existingAwards } = await supabase
    .from('player_awards')
    .select('*')
    .eq('match_id', matchId);

  let isReprocessing = false;

  const match = await getMatchByMatchId(matchId);
  if (!match) {
    return { success: false, error: 'Partita non trovata' };
  }

  // Statistiche della partita al momento del reprocessing (le "vecchie", prima
  // dell'eventuale nuovo salvataggio del risultato che ha preceduto questa chiamata)
  const oldPlayerStats = await getMatchPlayerStats(matchId);

  if (existingAwards && existingAwards.length > 0) {
    isReprocessing = true;

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

        const updates: Record<string, number> = {
          gol: Math.max(0, existingRecord.gol - (oldMatchStats.gol || 0)),
          partite_disputate: Math.max(0, existingRecord.partite_disputate - 1),
          partite_vinte: Math.max(0, existingRecord.partite_vinte - (oldIsWin ? 1 : 0)),
          partite_pareggiate: Math.max(0, existingRecord.partite_pareggiate - (oldIsDraw ? 1 : 0)),
          partite_perse: Math.max(0, existingRecord.partite_perse - (oldIsLoss ? 1 : 0)),
          assistenze: Math.max(0, existingRecord.assistenze - (oldMatchStats.assist || 0)),
          cartellini_gialli: Math.max(0, existingRecord.cartellini_gialli - (oldMatchStats.gialli || 0)),
          cartellini_rossi: Math.max(0, existingRecord.cartellini_rossi - (oldMatchStats.rossi || 0)),
        };

        // Se il risultato viene modificato DOPO la finalizzazione, i contatori dell'era
        // ranked (solo gol/assist, mai rk_matches) vanno corretti insieme a quelli legacy.
        if (match.finalized) {
          updates.rk_goals = Math.max(0, existingRecord.rk_goals - (oldMatchStats.gol || 0));
          updates.rk_assists = Math.max(0, existingRecord.rk_assists - (oldMatchStats.assist || 0));
        }

        await supabase.from('player_stats').update(updates).eq('player_email', playerEmail);
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
      const updates: Record<string, unknown> = {
        gol: existingRecord.gol + (matchStats.gol || 0),
        partite_disputate: existingRecord.partite_disputate + 1,
        partite_vinte: existingRecord.partite_vinte + (isWin ? 1 : 0),
        partite_pareggiate: existingRecord.partite_pareggiate + (isDraw ? 1 : 0),
        partite_perse: existingRecord.partite_perse + (isLoss ? 1 : 0),
        assistenze: existingRecord.assistenze + (matchStats.assist || 0),
        cartellini_gialli: existingRecord.cartellini_gialli + (matchStats.gialli || 0),
        cartellini_rossi: existingRecord.cartellini_rossi + (matchStats.rossi || 0),
        updated_at: new Date().toISOString(),
      };

      if (isReprocessing && match.finalized) {
        updates.rk_goals = existingRecord.rk_goals + (matchStats.gol || 0);
        updates.rk_assists = existingRecord.rk_assists + (matchStats.assist || 0);
      }

      await supabase.from('player_stats').update(updates).eq('player_email', playerEmail);
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
  playersUpdated?: number;
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
      playersUpdated: finalizeResult.playersUpdated || 0,
    };
  }

  return {
    success: false,
    error: 'Timeout raggiunto ma finalizzazione fallita',
    timeout: true,
    hoursElapsed: Math.round(hoursElapsed * 10) / 10,
  };
}
