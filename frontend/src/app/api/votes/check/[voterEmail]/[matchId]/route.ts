import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ voterEmail: string; matchId: string }> }
) {
  try {
    const { voterEmail, matchId } = await params;
    const decodedVoterEmail = decodeURIComponent(voterEmail);
    const decodedMatchId = decodeURIComponent(matchId);

    const { data, error } = await supabase
      .from('votes')
      .select('id')
      .eq('from_player_id', decodedVoterEmail)
      .eq('match_id', decodedMatchId)
      .limit(1);

    if (error) throw error;

    const hasVoted = (data || []).length > 0;

    return NextResponse.json({
      voterEmail: decodedVoterEmail,
      matchId: decodedMatchId,
      hasVoted,
      recordsFound: data?.length || 0,
    });
  } catch (error) {
    console.error('Errore controllo voti:', error);
    return NextResponse.json(
      { error: 'Errore nel controllo voti', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
