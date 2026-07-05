import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { computeStats } from '@/utils/playerRating';

export async function POST(request: NextRequest) {
  try {
    const { player1Email, player2Email } = await request.json();

    if (!player1Email || !player2Email) {
      return NextResponse.json({ error: 'Email dei giocatori richieste' }, { status: 400 });
    }

    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('email, name, photo_url')
      .in('email', [player1Email, player2Email]);

    if (playersError) throw playersError;

    const { data: statsData, error: statsError } = await supabase
      .from('player_stats')
      .select('*')
      .in('player_email', [player1Email, player2Email]);

    if (statsError) throw statsError;

    const statsByEmail = new Map((statsData || []).map((row) => [String(row.player_email).toLowerCase(), row]));

    function buildPlayer(email: string) {
      const p = (playersData || []).find((row) => String(row.email).toLowerCase() === email.toLowerCase());
      if (!p) return null;

      const statsRow = statsByEmail.get(email.toLowerCase());
      const computed = computeStats(statsRow);

      return {
        id: p.email,
        name: p.name,
        email: p.email,
        overall: computed.overall,
        tier: computed.tier,
        ranked: computed.ranked,
        rkMatches: computed.rkMatches,
        ATT: computed.ATT,
        PAS: computed.PAS,
        DIF: computed.DIF,
        POR: computed.POR,
        ratings: { difAvg: computed.difAvg, porAvg: computed.porAvg, mvpAvg: computed.mvpAvg },
        stats: {
          gol: statsRow?.gol || 0,
          partiteDisputate: statsRow?.partite_disputate || 0,
          partiteVinte: statsRow?.partite_vinte || 0,
          partitePareggiate: statsRow?.partite_pareggiate || 0,
          partitePerse: statsRow?.partite_perse || 0,
          assistenze: statsRow?.assistenze || 0,
          cartelliniGialli: statsRow?.cartellini_gialli || 0,
          cartelliniRossi: statsRow?.cartellini_rossi || 0,
        },
      };
    }

    const player1 = buildPlayer(player1Email);
    const player2 = buildPlayer(player2Email);

    if (!player1 || !player2) {
      return NextResponse.json({ error: 'Uno o entrambi i giocatori non trovati' }, { status: 404 });
    }

    return NextResponse.json({ player1, player2 });
  } catch (error) {
    console.error('Errore nel confronto giocatori:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
