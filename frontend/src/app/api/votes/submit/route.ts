import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { getMatchByMatchId } from '@/utils/matches';
import { finalizeVoting } from '@/utils/matchEngine';

interface IncomingVote {
  playerEmail: string;
  voteType: 'UP' | 'DOWN' | 'NEUTRAL';
  motmVote: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { voterEmail, matchId, votes } = await req.json();

    if (!voterEmail || !matchId || !votes || !Array.isArray(votes) || votes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Dati di votazione mancanti o non validi (voterEmail, matchId, votes richiesti)' },
        { status: 400 }
      );
    }

    const match = await getMatchByMatchId(matchId);
    if (!match) {
      return NextResponse.json({ success: false, error: 'Partita non trovata', code: 'MATCH_NOT_FOUND' }, { status: 404 });
    }

    if (match.finalized || match.voting_status === 'closed') {
      return NextResponse.json(
        { success: false, error: 'Le votazioni per questa partita sono chiuse', code: 'VOTING_CLOSED' },
        { status: 403 }
      );
    }

    const { data: existingVotes, error: existingError } = await supabase
      .from('votes')
      .select('id')
      .eq('from_player_id', voterEmail)
      .eq('match_id', matchId)
      .limit(1);

    if (existingError) throw existingError;

    if (existingVotes && existingVotes.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Hai già votato per questa partita!', code: 'ALREADY_VOTED' },
        { status: 409 }
      );
    }

    const invalidVotes = (votes as IncomingVote[]).filter(
      (vote) => !['UP', 'DOWN', 'NEUTRAL'].includes(vote.voteType) || typeof vote.motmVote !== 'boolean'
    );
    if (invalidVotes.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Voti non validi: ogni voto deve essere UP, DOWN o NEUTRAL con motmVote boolean' },
        { status: 400 }
      );
    }

    const voteRows = (votes as IncomingVote[]).map((vote) => ({
      match_id: matchId,
      from_player_id: voterEmail,
      to_player_id: vote.playerEmail,
      vote_type: vote.voteType,
      motm_vote: vote.motmVote,
    }));

    const { data: createdRecords, error: insertError } = await supabase.from('votes').insert(voteRows).select();
    if (insertError) throw insertError;

    const stats = {
      total: createdRecords?.length || 0,
      upVotes: votes.filter((v: IncomingVote) => v.voteType === 'UP').length,
      downVotes: votes.filter((v: IncomingVote) => v.voteType === 'DOWN').length,
      neutralVotes: votes.filter((v: IncomingVote) => v.voteType === 'NEUTRAL').length,
      motmVotes: votes.filter((v: IncomingVote) => v.motmVote).length,
    };

    // Controlla se tutti i giocatori della partita hanno votato (o se sono passate 24h) e, in caso, finalizza subito.
    const allMatchPlayers = [...match.team_a, ...match.team_b];

    const { data: allVoteRecords, error: allVotesError } = await supabase
      .from('votes')
      .select('from_player_id')
      .eq('match_id', matchId);

    if (allVotesError) {
      return NextResponse.json({
        success: true,
        message: `${stats.total} voti salvati con successo per la partita ${matchId}`,
        votesSubmitted: stats.total,
        matchId,
        stats,
        autoFinalized: false,
        checkError: 'Errore nel controllo auto-finalizzazione',
      });
    }

    const uniqueVoters = new Set((allVoteRecords || []).map((v) => v.from_player_id as string));
    const votersFromMatch = allMatchPlayers.filter((email) => uniqueVoters.has(email));

    let timeoutReached = false;
    if (match.voting_started_at) {
      const startTime = new Date(match.voting_started_at).getTime();
      timeoutReached = Date.now() - startTime > 24 * 60 * 60 * 1000;
    }

    if (votersFromMatch.length === allMatchPlayers.length || timeoutReached) {
      const finalizeResult = await finalizeVoting(matchId);

      if (finalizeResult.success) {
        return NextResponse.json({
          success: true,
          message: `${stats.total} voti salvati con successo per la partita ${matchId}`,
          votesSubmitted: stats.total,
          matchId,
          stats,
          autoFinalized: true,
          phase2Complete: true,
          finalizeMessage: finalizeResult.message,
          motmAwarded: finalizeResult.motmAwards || 0,
          abilitiesUpdated: finalizeResult.playerAbilitiesUpdated || 0,
        });
      }

      return NextResponse.json({
        success: true,
        message: `${stats.total} voti salvati con successo per la partita ${matchId}`,
        votesSubmitted: stats.total,
        matchId,
        stats,
        autoFinalized: false,
        finalizeError: finalizeResult.error,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${stats.total} voti salvati con successo per la partita ${matchId}`,
      votesSubmitted: stats.total,
      matchId,
      stats,
      autoFinalized: false,
      votingProgress: `${votersFromMatch.length}/${allMatchPlayers.length} giocatori hanno votato`,
    });
  } catch (error) {
    console.error('Errore nel salvare i voti:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Errore interno del server',
        details: error instanceof Error ? error.message : 'Errore sconosciuto',
      },
      { status: 500 }
    );
  }
}
