import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { checkVotingTimeout } from '@/utils/matchEngine';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: openVotingMatches, error } = await supabase
      .from('matches')
      .select('match_id, voting_started_at')
      .eq('voting_status', 'open')
      .not('voting_started_at', 'is', null);

    if (error) throw error;

    if (!openVotingMatches || openVotingMatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nessuna partita con votazioni aperte da controllare',
        checkedMatches: 0,
        timeoutMatches: 0,
      });
    }

    const results = [];
    let timeoutCount = 0;
    let errorCount = 0;

    for (const match of openVotingMatches) {
      const matchId = match.match_id;
      const votingStartedAt = match.voting_started_at as string;

      try {
        const startTime = new Date(votingStartedAt).getTime();
        const hoursElapsed = (Date.now() - startTime) / (60 * 60 * 1000);

        if (hoursElapsed > 24) {
          const timeoutResult = await checkVotingTimeout(matchId);

          if (timeoutResult.success && timeoutResult.autoFinalized) {
            timeoutCount++;
            results.push({
              matchId,
              status: 'timeout_finalized',
              hoursElapsed: Math.round(hoursElapsed * 10) / 10,
              motmAwarded: timeoutResult.motmAwarded || 0,
              playersUpdated: timeoutResult.playersUpdated || 0,
            });
          } else {
            errorCount++;
            results.push({
              matchId,
              status: 'timeout_error',
              hoursElapsed: Math.round(hoursElapsed * 10) / 10,
              error: timeoutResult.error,
            });
          }
        } else {
          const remainingHours = Math.max(0, 24 - hoursElapsed);
          results.push({
            matchId,
            status: 'still_open',
            hoursElapsed: Math.round(hoursElapsed * 10) / 10,
            hoursRemaining: Math.round(remainingHours * 10) / 10,
          });
        }
      } catch (matchError) {
        errorCount++;
        results.push({
          matchId,
          status: 'check_error',
          error: matchError instanceof Error ? matchError.message : 'Errore sconosciuto',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Controllo timeout completato: ${timeoutCount} partite finalizzate, ${errorCount} errori`,
      checkedMatches: openVotingMatches.length,
      timeoutMatches: timeoutCount,
      errorMatches: errorCount,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Errore generale nel controllo timeout:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Errore nel controllo automatico timeout',
        details: error instanceof Error ? error.message : 'Errore sconosciuto',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
