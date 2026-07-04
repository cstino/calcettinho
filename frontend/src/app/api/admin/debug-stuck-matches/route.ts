import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { finalizeVoting } from '@/utils/matchEngine';

export async function GET() {
  try {
    const { data: completedMatches, error } = await supabase.from('matches').select('*').eq('completed', true);
    if (error) throw error;

    const results = [];

    for (const match of completedMatches || []) {
      const matchId = match.match_id;
      const matchDate = match.match_date;
      const teamA: string[] = match.team_a || [];
      const teamB: string[] = match.team_b || [];
      const allPlayers = [...teamA, ...teamB];

      let hoursElapsed = 0;
      let isTimeout = false;

      if (matchDate) {
        const matchTime = new Date(matchDate).getTime();
        hoursElapsed = (Date.now() - matchTime) / (60 * 60 * 1000);
        isTimeout = hoursElapsed > 24;
      }

      const { data: voteRecords } = await supabase.from('votes').select('from_player_id').eq('match_id', matchId);

      const uniqueVoters = new Set(
        (voteRecords || []).map((v) => v.from_player_id as string).filter((email) => email != null && email !== '')
      );
      const votersFromMatch = allPlayers.filter((email) => uniqueVoters.has(email));

      const isStuck = hoursElapsed > 1 && votersFromMatch.length < allPlayers.length;

      if (isStuck || votersFromMatch.length < allPlayers.length) {
        results.push({
          matchId,
          matchDate,
          hoursElapsed: Math.round(hoursElapsed * 10) / 10,
          isTimeout,
          isStuck,
          totalPlayers: allPlayers.length,
          playersVoted: votersFromMatch.length,
          playersWhoVoted: Array.from(uniqueVoters),
          playersWhoHaventVoted: allPlayers.filter((email) => !uniqueVoters.has(email)),
          teamA,
          teamB,
          scoreA: match.score_a,
          scoreB: match.score_b,
          status: isTimeout ? 'TIMEOUT_STUCK' : isStuck ? 'STUCK' : 'WAITING_VOTES',
          voteRecordsFound: voteRecords?.length || 0,
        });
      }
    }

    results.sort((a, b) => b.hoursElapsed - a.hoursElapsed);

    const stuckCount = results.filter((r) => r.isStuck).length;
    const timeoutCount = results.filter((r) => r.isTimeout).length;

    return NextResponse.json({
      success: true,
      message: `Trovate ${results.length} partite con votazioni incomplete`,
      stuckMatches: stuckCount,
      timeoutMatches: timeoutCount,
      waitingMatches: results.filter((r) => !r.isStuck && !r.isTimeout).length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Errore nel debug partite bloccate:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel debug partite bloccate', details: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { matchId, forceFinalize } = await req.json();

    if (!matchId) {
      return NextResponse.json({ success: false, error: 'matchId richiesto' }, { status: 400 });
    }

    if (forceFinalize) {
      const result = await finalizeVoting(matchId, { force: true });

      if (result.success) {
        return NextResponse.json({ success: true, message: 'Partita finalizzata forzatamente', matchId, finalizeData: result });
      }

      return NextResponse.json(
        { success: false, error: 'Errore nella finalizzazione forzata', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: false, error: 'Azione non specificata' }, { status: 400 });
  } catch (error) {
    console.error('Errore nella riparazione partita:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nella riparazione partita', details: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
}
