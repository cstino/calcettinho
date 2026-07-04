import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET() {
  try {
    const { data: playersData, error: playersError } = await supabase.from('players').select('*');
    if (playersError) throw playersError;

    const { data: statsData, error: statsError } = await supabase.from('player_stats').select('*');
    if (statsError) throw statsError;

    const statsMap = new Map();
    (statsData || []).forEach((row) => {
      statsMap.set(row.player_email, {
        gol: row.gol || 0,
        partiteDisputate: row.partite_disputate || 0,
        partiteVinte: row.partite_vinte || 0,
        partitePareggiate: row.partite_pareggiate || 0,
        partitePerse: row.partite_perse || 0,
        assistenze: row.assistenze || 0,
        cartelliniGialli: row.cartellini_gialli || 0,
        cartelliniRossi: row.cartellini_rossi || 0,
      });
    });

    const playersWithStats = (playersData || [])
      .filter((player) => player.name && player.name.trim() !== '')
      .map((player, index) => {
        const stats = statsMap.get(player.email) || {
          gol: 0,
          partiteDisputate: 0,
          partiteVinte: 0,
          partitePareggiate: 0,
          partitePerse: 0,
          assistenze: 0,
          cartelliniGialli: 0,
          cartelliniRossi: 0,
        };

        const values = [player.attacco, player.difesa, player.velocita, player.forza, player.passaggio, player.portiere].map(
          (v) => Number(v) || 0
        );
        const top5 = values.sort((a, b) => b - a).slice(0, 5);
        const overall = Math.round(top5.reduce((sum, v) => sum + v, 0) / 5);

        return {
          id: (index + 1).toString(),
          name: player.name,
          email: player.email,
          matches: stats.partiteDisputate,
          wins: stats.partiteVinte,
          losses: stats.partitePerse,
          draws: stats.partitePareggiate,
          goals: stats.gol,
          assists: stats.assistenze,
          yellowCards: stats.cartelliniGialli,
          redCards: stats.cartelliniRossi,
          overall,
        };
      });

    return NextResponse.json(playersWithStats);
  } catch (error) {
    console.error('Errore nel recupero statistiche aggregate:', error);
    return NextResponse.json([], { status: 500 });
  }
}
