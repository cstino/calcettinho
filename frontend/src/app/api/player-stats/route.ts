import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase.from('player_stats').select('*');

    if (error) throw error;

    const playerStats = (data || []).map((row) => ({
      playerEmail: row.player_email,
      gol: row.gol,
      partiteDisputate: row.partite_disputate,
      partiteVinte: row.partite_vinte,
      partitePareggiate: row.partite_pareggiate,
      partitePerse: row.partite_perse,
      assistenze: row.assistenze,
      cartelliniGialli: row.cartellini_gialli,
      cartelliniRossi: row.cartellini_rossi,
    }));

    return NextResponse.json(playerStats);
  } catch (error) {
    console.error('Errore nel recupero statistiche giocatori:', error);
    return NextResponse.json([]);
  }
}
