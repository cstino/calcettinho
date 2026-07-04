import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);

    const { data: statsRow, error: statsError } = await supabase
      .from('player_stats')
      .select('up_votes, down_votes, neutral_votes, motm_votes')
      .eq('player_email', email)
      .maybeSingle();

    if (statsError) throw statsError;

    const { count: actualMotm } = await supabase
      .from('player_awards')
      .select('id', { count: 'exact', head: true })
      .eq('player_email', email)
      .eq('award_type', 'motm');

    const upVotes = statsRow?.up_votes || 0;
    const downVotes = statsRow?.down_votes || 0;
    const neutralVotes = statsRow?.neutral_votes || 0;
    const motmVotes = statsRow?.motm_votes || 0;
    const totalVotes = upVotes + downVotes + neutralVotes;

    // Recupera i risultati dell'ultima partita non ancora aggregata (votes è transiente:
    // le righe vengono cancellate dopo la finalizzazione e riassunte in player_stats).
    let lastMatchResults: Array<{
      matchId: string;
      upVotes: number;
      downVotes: number;
      neutralVotes: number;
      motmVotes: number;
      netVotes: number;
      wasMotmCandidate: boolean;
    }> = [];

    const { data: recentVotes } = await supabase
      .from('votes')
      .select('match_id, vote_type, motm_vote, created_at')
      .eq('to_player_id', email)
      .order('created_at', { ascending: false })
      .limit(50);

    if (recentVotes && recentVotes.length > 0) {
      const votesByMatch: Record<string, { created: string; up: number; down: number; neutral: number; motm: number }> = {};

      recentVotes.forEach((vote) => {
        const matchId = vote.match_id as string;
        if (!votesByMatch[matchId]) {
          votesByMatch[matchId] = { created: vote.created_at, up: 0, down: 0, neutral: 0, motm: 0 };
        }
        if (vote.vote_type === 'UP') votesByMatch[matchId].up++;
        else if (vote.vote_type === 'DOWN') votesByMatch[matchId].down++;
        else if (vote.vote_type === 'NEUTRAL') votesByMatch[matchId].neutral++;
        if (vote.motm_vote) votesByMatch[matchId].motm++;
      });

      const sortedMatches = Object.entries(votesByMatch).sort(
        ([, a], [, b]) => new Date(b.created).getTime() - new Date(a.created).getTime()
      );

      if (sortedMatches.length > 0) {
        const [lastMatchId, lastMatchData] = sortedMatches[0];
        lastMatchResults = [
          {
            matchId: lastMatchId,
            upVotes: lastMatchData.up,
            downVotes: lastMatchData.down,
            neutralVotes: lastMatchData.neutral,
            motmVotes: lastMatchData.motm,
            netVotes: lastMatchData.up - lastMatchData.down,
            wasMotmCandidate: lastMatchData.motm > 0,
          },
        ];
      }
    }

    return NextResponse.json({
      success: true,
      playerEmail: email,
      votes: [],
      statistics: {
        totalVotes,
        upVotes,
        downVotes,
        neutralVotes,
        motmVotes,
        netVotes: upVotes - downVotes,
        upPercentage: totalVotes > 0 ? parseFloat(((upVotes / totalVotes) * 100).toFixed(1)) : 0,
        totalMatches: 0,
        actualMotm: actualMotm || 0,
        motmCandidacies: 0,
      },
      matchResults: lastMatchResults,
    });
  } catch (error) {
    console.error('Errore nel recupero storico votazioni:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Errore nel recupero dello storico votazioni',
        details: error instanceof Error ? error.message : 'Errore sconosciuto',
      },
      { status: 500 }
    );
  }
}
