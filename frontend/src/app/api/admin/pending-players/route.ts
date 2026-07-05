import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('email, name, username, raw_photo_url, created_at')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, players: data || [] });
  } catch (error) {
    console.error('Errore nel recupero registrazioni da confermare:', error);
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 });
  }
}
