import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

const RESTORE_WINDOW_DAYS = 7;

export async function GET() {
  try {
    const cutoff = new Date(Date.now() - RESTORE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('players')
      .select('email, name, username, photo_url, deleted_at')
      .not('deleted_at', 'is', null)
      .gte('deleted_at', cutoff)
      .order('deleted_at', { ascending: false });

    if (error) throw error;

    const users = (data || []).map((p) => {
      const daysElapsed = (Date.now() - new Date(p.deleted_at).getTime()) / (1000 * 60 * 60 * 24);
      return {
        email: p.email,
        name: p.name,
        username: p.username,
        photoUrl: p.photo_url,
        deletedAt: p.deleted_at,
        daysLeft: Math.max(0, Math.ceil(RESTORE_WINDOW_DAYS - daysElapsed)),
      };
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Errore nel recupero utenti eliminati:', error);
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 });
  }
}
