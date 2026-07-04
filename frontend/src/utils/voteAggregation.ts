import { supabase } from './supabase';

interface VoteAggregation {
  playerEmail: string;
  upVotes: number;
  downVotes: number;
  neutralVotes: number;
  motmVotes: number;
  totalVotes: number;
  netVotes: number;
}

export async function aggregateVotesForMatch(matchId: string): Promise<VoteAggregation[]> {
  const { data: voteRecords, error } = await supabase
    .from('votes')
    .select('to_player_id, vote_type, motm_vote')
    .eq('match_id', matchId);

  if (error) {
    console.error('Errore nel recupero voti per aggregazione:', error);
    throw error;
  }

  const votesByPlayer: { [playerEmail: string]: VoteAggregation } = {};

  (voteRecords || []).forEach((vote) => {
    const toPlayerId = vote.to_player_id as string;
    const voteType = vote.vote_type as string;
    const motmVote = vote.motm_vote as boolean;

    if (!votesByPlayer[toPlayerId]) {
      votesByPlayer[toPlayerId] = {
        playerEmail: toPlayerId,
        upVotes: 0,
        downVotes: 0,
        neutralVotes: 0,
        motmVotes: 0,
        totalVotes: 0,
        netVotes: 0,
      };
    }

    if (voteType === 'UP') {
      votesByPlayer[toPlayerId].upVotes++;
    } else if (voteType === 'DOWN') {
      votesByPlayer[toPlayerId].downVotes++;
    } else if (voteType === 'NEUTRAL') {
      votesByPlayer[toPlayerId].neutralVotes++;
    }

    if (motmVote) {
      votesByPlayer[toPlayerId].motmVotes++;
    }

    votesByPlayer[toPlayerId].totalVotes++;
  });

  Object.values(votesByPlayer).forEach((aggregation) => {
    aggregation.netVotes = aggregation.upVotes - aggregation.downVotes;
  });

  return Object.values(votesByPlayer);
}

export async function updatePlayerStatsWithVotes(
  playerEmail: string,
  voteAggregation: VoteAggregation
): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from('player_stats')
    .select('up_votes, down_votes, neutral_votes, motm_votes')
    .eq('player_email', playerEmail)
    .maybeSingle();

  if (selectError) {
    console.error(`Errore nel recupero player_stats per ${playerEmail}:`, selectError);
    throw selectError;
  }

  if (!existing) {
    const { error: insertError } = await supabase.from('player_stats').insert({
      player_email: playerEmail,
      up_votes: voteAggregation.upVotes,
      down_votes: voteAggregation.downVotes,
      neutral_votes: voteAggregation.neutralVotes,
      motm_votes: voteAggregation.motmVotes,
    });

    if (insertError) {
      console.error(`Errore nella creazione player_stats per ${playerEmail}:`, insertError);
      throw insertError;
    }
    return;
  }

  const { error: updateError } = await supabase
    .from('player_stats')
    .update({
      up_votes: (existing.up_votes || 0) + voteAggregation.upVotes,
      down_votes: (existing.down_votes || 0) + voteAggregation.downVotes,
      neutral_votes: (existing.neutral_votes || 0) + voteAggregation.neutralVotes,
      motm_votes: (existing.motm_votes || 0) + voteAggregation.motmVotes,
      updated_at: new Date().toISOString(),
    })
    .eq('player_email', playerEmail);

  if (updateError) {
    console.error(`Errore nell'aggiornamento player_stats per ${playerEmail}:`, updateError);
    throw updateError;
  }
}

export async function processMatchVotesToPlayerStats(matchId: string): Promise<void> {
  const aggregations = await aggregateVotesForMatch(matchId);

  for (const aggregation of aggregations) {
    await updatePlayerStatsWithVotes(aggregation.playerEmail, aggregation);
  }
}

export async function cleanupMatchVotes(matchId: string): Promise<void> {
  const { error } = await supabase.from('votes').delete().eq('match_id', matchId);

  if (error) {
    console.error('Errore nella cancellazione voti:', error);
    throw error;
  }
}
