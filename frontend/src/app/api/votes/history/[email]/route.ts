import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { computeStats } from '@/utils/playerRating';

export async function GET(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);

    const { data: statsRow, error: statsError } = await supabase
      .from('player_stats')
      .select('*')
      .eq('player_email', email)
      .maybeSingle();

    if (statsError) throw statsError;

    const computed = computeStats(statsRow);

    const { count: actualMotm } = await supabase
      .from('player_awards')
      .select('id', { count: 'exact', head: true })
      .eq('player_email', email)
      .eq('award_type', 'motm');

    // Ultima partita dallo snapshot permanente match_ratings
    const { data: lastRatings } = await supabase
      .from('match_ratings')
      .select('*')
      .eq('player_email', email)
      .order('created_at', { ascending: false })
      .limit(5);

    const matchResults = (lastRatings || []).map((row) => ({
      matchId: row.match_id,
      difAvg: Number(row.dif_avg),
      porAvg: Number(row.por_avg),
      mvpAvg: Number(row.mvp_avg),
      ratingsCount: row.ratings_count,
      isMotm: row.is_motm === true,
      date: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      playerEmail: email,
      statistics: {
        ranked: computed.ranked,
        rkMatches: computed.rkMatches,
        difAvg: computed.difAvg,
        porAvg: computed.porAvg,
        mvpAvg: computed.mvpAvg,
        ratingsReceived: statsRow?.dif_count || 0,
        actualMotm: actualMotm || 0,
      },
      matchResults,
    });
  } catch (error) {
    console.error('Errore nel recupero storico voti:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Errore nel recupero dello storico voti',
        details: error instanceof Error ? error.message : 'Errore sconosciuto',
      },
      { status: 500 }
    );
  }
}
