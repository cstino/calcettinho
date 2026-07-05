import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { computeStats } from '@/utils/playerRating';

export async function GET() {
  try {
    const { data: playersData, error: playersError } = await supabase.from('players').select('email, name, photo_url');
    if (playersError) throw playersError;

    const { data: statsData, error: statsError } = await supabase.from('player_stats').select('*');
    if (statsError) throw statsError;

    const statsMap = new Map((statsData || []).map((row) => [String(row.player_email).toLowerCase(), row]));

    const playersWithStats = (playersData || [])
      .filter((player) => player.name && player.name.trim() !== '')
      .map((player, index) => {
        const row = statsMap.get(String(player.email).toLowerCase());
        const computed = computeStats(row);

        return {
          id: (index + 1).toString(),
          name: player.name,
          email: player.email,
          matches: row?.partite_disputate || 0,
          wins: row?.partite_vinte || 0,
          losses: row?.partite_perse || 0,
          draws: row?.partite_pareggiate || 0,
          goals: row?.gol || 0,
          assists: row?.assistenze || 0,
          yellowCards: row?.cartellini_gialli || 0,
          redCards: row?.cartellini_rossi || 0,
          overall: computed.overall,
          tier: computed.tier,
          ranked: computed.ranked,
        };
      });

    return NextResponse.json(playersWithStats);
  } catch (error) {
    console.error('Errore nel recupero statistiche aggregate:', error);
    return NextResponse.json([], { status: 500 });
  }
}
