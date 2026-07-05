import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { getMatchByMatchId } from '@/utils/matches';
import { finalizeVoting } from '@/utils/matchEngine';

interface IncomingVote {
  playerEmail: string;
  difRating: number;
  porRating: number;
  mvpRating: number;
}

function isValidRating(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 10;
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

    const allMatchPlayers = [...match.team_a, ...match.team_b];
    const voterLower = String(voterEmail).toLowerCase();

    // Il votante deve essere un partecipante della partita
    if (!allMatchPlayers.some((email) => email.toLowerCase() === voterLower)) {
      return NextResponse.json(
        { success: false, error: 'Solo i partecipanti della partita possono votare', code: 'NOT_A_PARTICIPANT' },
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

    // Validazione: tre rating interi 1-10 per ogni altro giocatore del match (tutti, una volta sola)
    const expectedTargets = allMatchPlayers.filter((email) => email.toLowerCase() !== voterLower);
    const seenTargets = new Set<string>();

    for (const vote of votes as IncomingVote[]) {
      const target = String(vote.playerEmail || '').toLowerCase();

      if (!expectedTargets.some((email) => email.toLowerCase() === target)) {
        return NextResponse.json(
          { success: false, error: `Giocatore non valido nel voto: ${vote.playerEmail}` },
          { status: 400 }
        );
      }
      if (seenTargets.has(target)) {
        return NextResponse.json(
          { success: false, error: `Voto duplicato per ${vote.playerEmail}` },
          { status: 400 }
        );
      }
      seenTargets.add(target);

      if (!isValidRating(vote.difRating) || !isValidRating(vote.porRating) || !isValidRating(vote.mvpRating)) {
        return NextResponse.json(
          { success: false, error: 'Ogni voto deve avere difRating, porRating e mvpRating interi da 1 a 10' },
          { status: 400 }
        );
      }
    }

    if (seenTargets.size !== expectedTargets.length) {
      return NextResponse.json(
        { success: false, error: `Devi votare tutti i giocatori della partita (${expectedTargets.length})` },
        { status: 400 }
      );
    }

    const voteRows = (votes as IncomingVote[]).map((vote) => ({
      match_id: matchId,
      from_player_id: voterEmail,
      to_player_id: vote.playerEmail,
      dif_rating: vote.difRating,
      por_rating: vote.porRating,
      mvp_rating: vote.mvpRating,
    }));

    const { data: createdRecords, error: insertError } = await supabase.from('votes').insert(voteRows).select();
    if (insertError) throw insertError;

    const votesSubmitted = createdRecords?.length || 0;

    // Auto-finalizzazione: se tutti hanno votato (o 24h passate), chiudi subito
    const { data: allVoteRecords, error: allVotesError } = await supabase
      .from('votes')
      .select('from_player_id')
      .eq('match_id', matchId);

    if (allVotesError) {
      return NextResponse.json({
        success: true,
        message: `${votesSubmitted} voti salvati con successo per la partita ${matchId}`,
        votesSubmitted,
        matchId,
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
          message: `${votesSubmitted} voti salvati con successo per la partita ${matchId}`,
          votesSubmitted,
          matchId,
          autoFinalized: true,
          finalizeMessage: finalizeResult.message,
          motmAwarded: finalizeResult.motmAwards || 0,
          playersUpdated: finalizeResult.playersUpdated || 0,
        });
      }

      return NextResponse.json({
        success: true,
        message: `${votesSubmitted} voti salvati con successo per la partita ${matchId}`,
        votesSubmitted,
        matchId,
        autoFinalized: false,
        finalizeError: finalizeResult.error,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${votesSubmitted} voti salvati con successo per la partita ${matchId}`,
      votesSubmitted,
      matchId,
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
