import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { processAwards } from '@/utils/matchEngine';

export async function POST() {
  try {
    const { count: statsCount } = await supabase.from('player_stats').select('*', { count: 'exact', head: true });
    await supabase.from('player_stats').delete().neq('player_email', '');

    await supabase.from('player_awards').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { data: matches, error } = await supabase.from('matches').select('match_id').eq('completed', true);
    if (error) throw error;

    let successfulProcessed = 0;
    let errors = 0;

    for (const match of matches || []) {
      try {
        const result = await processAwards(match.match_id);
        if (result.success) {
          successfulProcessed++;
        } else {
          errors++;
        }
      } catch (matchError) {
        console.error('Errore nel processare partita:', matchError);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reset statistiche completato con successo',
      details: {
        statsResetted: statsCount || 0,
        matchesReprocessed: successfulProcessed,
        errors,
        totalMatches: matches?.length || 0,
      },
    });
  } catch (error) {
    console.error('Errore nel reset statistiche:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel reset delle statistiche', details: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
}
