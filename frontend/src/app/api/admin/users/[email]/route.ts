import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

// Elimina un utente (soft-delete): revoca l'accesso subito, ma la riga players
// resta per sempre — player_stats/match_player_stats/player_awards/match_ratings
// la referenziano e devono restare intatti per lo storico condiviso con gli altri
// giocatori delle partite passate. Ripristinabile entro 7 giorni (vedi /restore).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
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
    if (player.deleted_at) {
      return NextResponse.json({ success: false, error: 'Giocatore già eliminato' }, { status: 400 });
    }

    const { error: whitelistError } = await supabase.from('whitelist').delete().eq('email', email);
    if (whitelistError) throw whitelistError;

    const { error: updateError } = await supabase
      .from('players')
      .update({ deleted_at: new Date().toISOString() })
      .eq('email', email);
    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore eliminazione utente:', error);
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 });
  }
}
