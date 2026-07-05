import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

// Elimina completamente una partita sandbox e ripristina player_stats allo stato
// esatto precedente al test (snapshot preso in /sandbox/create).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await params;

    if (!matchId.startsWith('sandbox_')) {
      return NextResponse.json({ success: false, error: 'ID non è una partita sandbox' }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabase
      .from('sandbox_sessions')
      .select('*')
      .eq('match_id', matchId)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sessione sandbox non trovata (già ripulita?)' }, { status: 404 });
    }

    await supabase.from('match_ratings').delete().eq('match_id', matchId);
    await supabase.from('player_awards').delete().eq('match_id', matchId);
    await supabase.from('match_player_stats').delete().eq('match_id', matchId);
    await supabase.from('votes').delete().eq('match_id', matchId);

    const snapshot = (session.snapshot || []) as Array<Record<string, unknown>>;
    for (const row of snapshot) {
      const { player_email, ...fields } = row;
      await supabase.from('player_stats').update(fields).eq('player_email', player_email as string);
    }

    await supabase.from('matches').delete().eq('match_id', matchId);
    await supabase.from('sandbox_sessions').delete().eq('match_id', matchId);

    return NextResponse.json({ success: true, message: 'Sandbox eliminata, stato ripristinato esattamente com\'era prima' });
  } catch (error) {
    console.error('Errore nella pulizia sandbox:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nella pulizia sandbox', details: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
}
