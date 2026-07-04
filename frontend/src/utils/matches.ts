import { supabase } from './supabase';

export interface MatchPlayerStat {
  gol: number;
  assist: number;
  gialli: number;
  rossi: number;
}

export type MatchPlayerStatsMap = Record<string, MatchPlayerStat>;

interface MatchRow {
  match_id: string;
  match_date: string;
  team_a: string[];
  team_b: string[];
  score_a: number | null;
  score_b: number | null;
  team_a_scorer: string | null;
  team_b_scorer: string | null;
  assist_a: string | null;
  assist_b: string | null;
  completed: boolean;
  match_status: string | null;
  finalized: boolean;
  voting_status: string;
  voting_started_at: string | null;
  voting_closed_at: string | null;
  voting_close_reason: string | null;
  referee: string | null;
  location: string | null;
}

export async function getMatchPlayerStats(matchId: string): Promise<MatchPlayerStatsMap> {
  const { data, error } = await supabase
    .from('match_player_stats')
    .select('player_email, gol, assist, gialli, rossi')
    .eq('match_id', matchId);

  if (error) {
    console.error('Errore nel recupero match_player_stats:', error);
    return {};
  }

  const map: MatchPlayerStatsMap = {};
  (data || []).forEach((row) => {
    map[row.player_email] = {
      gol: row.gol,
      assist: row.assist,
      gialli: row.gialli,
      rossi: row.rossi,
    };
  });
  return map;
}

// Sostituisce interamente le righe match_player_stats di una partita con quelle fornite
// (stesso comportamento del vecchio blob JSON "playerStats" che veniva riscritto per intero).
export async function replaceMatchPlayerStats(
  matchId: string,
  playerStats: MatchPlayerStatsMap
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('match_player_stats')
    .delete()
    .eq('match_id', matchId);

  if (deleteError) {
    console.error('Errore nella cancellazione match_player_stats precedenti:', deleteError);
    throw deleteError;
  }

  const rows = Object.entries(playerStats).map(([playerEmail, stats]) => ({
    match_id: matchId,
    player_email: playerEmail,
    gol: stats.gol || 0,
    assist: stats.assist || 0,
    gialli: stats.gialli || 0,
    rossi: stats.rossi || 0,
  }));

  if (rows.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from('match_player_stats').insert(rows);

  if (insertError) {
    console.error('Errore nell\'inserimento match_player_stats:', insertError);
    throw insertError;
  }
}

export async function getMatchByMatchId(matchId: string): Promise<MatchRow | null> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('match_id', matchId)
    .maybeSingle();

  if (error) {
    console.error('Errore nel recupero della partita:', error);
    throw error;
  }

  return data as MatchRow | null;
}

export async function mapMatchToApi(row: MatchRow) {
  const playerStats = await getMatchPlayerStats(row.match_id);

  return {
    id: row.match_id,
    matchId: row.match_id,
    date: row.match_date,
    teamA: row.team_a || [],
    teamB: row.team_b || [],
    scoreA: row.score_a ?? undefined,
    scoreB: row.score_b ?? undefined,
    teamAScorer: row.team_a_scorer || '',
    teamBScorer: row.team_b_scorer || '',
    assistA: row.assist_a || '',
    assistB: row.assist_b || '',
    completed: row.completed === true,
    match_status: row.match_status || 'scheduled',
    finalized: row.finalized === true,
    voting_status: row.voting_status,
    voting_started_at: row.voting_started_at,
    voting_closed_at: row.voting_closed_at,
    voting_close_reason: row.voting_close_reason,
    referee: row.referee || '',
    location: row.location || 'Campo Centrale',
    playerStats,
    status: row.match_status || (row.completed === true ? 'completed' : 'scheduled'),
  };
}
