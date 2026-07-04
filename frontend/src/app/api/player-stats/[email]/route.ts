import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

const emptyStats = {
  gol: 0,
  partiteDisputate: 0,
  partiteVinte: 0,
  partitePareggiate: 0,
  partitePerse: 0,
  assistenze: 0,
  cartelliniGialli: 0,
  cartelliniRossi: 0,
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);

    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('player_email', email)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(emptyStats);
    }

    return NextResponse.json({
      gol: data.gol,
      partiteDisputate: data.partite_disputate,
      partiteVinte: data.partite_vinte,
      partitePareggiate: data.partite_pareggiate,
      partitePerse: data.partite_perse,
      assistenze: data.assistenze,
      cartelliniGialli: data.cartellini_gialli,
      cartelliniRossi: data.cartellini_rossi,
    });
  } catch (error) {
    console.error('Errore nel recupero statistiche giocatore:', error);
    return NextResponse.json(emptyStats);
  }
}
