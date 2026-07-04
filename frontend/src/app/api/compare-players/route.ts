import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

function calcOverall(p: { attacco: number; difesa: number; velocita: number; forza: number; passaggio: number; portiere: number }) {
  const values = [p.attacco, p.difesa, p.velocita, p.forza, p.passaggio, p.portiere].map((v) => Number(v) || 0);
  const top5 = values.sort((a, b) => b - a).slice(0, 5);
  return Math.round(top5.reduce((sum, v) => sum + v, 0) / 5);
}

export async function POST(request: NextRequest) {
  try {
    const { player1Email, player2Email } = await request.json();

    if (!player1Email || !player2Email) {
      return NextResponse.json({ error: 'Email dei giocatori richieste' }, { status: 400 });
    }

    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .in('email', [player1Email, player2Email]);

    if (playersError) throw playersError;

    const { data: statsData, error: statsError } = await supabase
      .from('player_stats')
      .select('*')
      .in('player_email', [player1Email, player2Email]);

    if (statsError) throw statsError;

    const votesData: Record<string, { upVotes: number; downVotes: number }> = {
      [player1Email]: { upVotes: 0, downVotes: 0 },
      [player2Email]: { upVotes: 0, downVotes: 0 },
    };

    (statsData || []).forEach((row) => {
      if (votesData[row.player_email]) {
        votesData[row.player_email].upVotes = row.up_votes || 0;
        votesData[row.player_email].downVotes = row.down_votes || 0;
      }
    });

    const playersMap = new Map();
    (playersData || []).forEach((row) => {
      playersMap.set(row.email, {
        id: row.email,
        name: row.name,
        email: row.email,
        overall: calcOverall(row),
        attacco: Number(row.attacco),
        difesa: Number(row.difesa),
        velocità: Number(row.velocita),
        forza: Number(row.forza),
        passaggio: Number(row.passaggio),
        portiere: Number(row.portiere),
      });
    });

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
        minutiGiocati: row.minuti_giocati || 0,
      });
    });

    const player1Data = playersMap.get(player1Email);
    const player2Data = playersMap.get(player2Email);

    if (!player1Data || !player2Data) {
      return NextResponse.json({ error: 'Uno o entrambi i giocatori non trovati' }, { status: 404 });
    }

    return NextResponse.json({
      player1: { ...player1Data, stats: statsMap.get(player1Email) || {}, votes: votesData[player1Email] },
      player2: { ...player2Data, stats: statsMap.get(player2Email) || {}, votes: votesData[player2Email] },
    });
  } catch (error) {
    console.error('Errore nel confronto giocatori:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
