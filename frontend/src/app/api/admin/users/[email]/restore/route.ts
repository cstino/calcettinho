import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

const RESTORE_WINDOW_DAYS = 7;

export async function POST(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);

    const { data: player, error: fetchError } = await supabase
      .from('players')
      .select('email, deleted_at')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!player) {
      return NextResponse.json({ success: false, error: 'Giocatore non trovato' }, { status: 404 });
    }
    if (!player.deleted_at) {
      return NextResponse.json({ success: false, error: 'Giocatore non risulta eliminato' }, { status: 400 });
    }

    const daysSince = (Date.now() - new Date(player.deleted_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > RESTORE_WINDOW_DAYS) {
      return NextResponse.json(
        { success: false, error: 'Finestra di ripristino di 7 giorni scaduta' },
        { status: 400 }
      );
    }

    const { error: whitelistError } = await supabase
      .from('whitelist')
      .upsert({ email, role: 'user' }, { onConflict: 'email' });
    if (whitelistError) throw whitelistError;

    const { error: updateError } = await supabase
      .from('players')
      .update({ deleted_at: null })
      .eq('email', email);
    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore ripristino utente:', error);
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 });
  }
}
