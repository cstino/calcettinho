import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { getMatchByMatchId, mapMatchToApi } from '@/utils/matches';
import { processAwards } from '@/utils/matchEngine';

interface PlayerMatchStats {
  gol?: number;
  assist?: number;
  gialli?: number;
  rossi?: number;
}

// Crea una partita sandbox reale per testare il flusso di voto con l'interfaccia vera.
// Salva uno snapshot di player_stats per i partecipanti così /cleanup può ripristinare
// lo stato esatto pre-test (stesso procedimento usato manualmente per validare la v3).
export async function POST(req: NextRequest) {
  try {
    const { teamA, teamB, scoreA, scoreB, playerStats } = await req.json();

    if (!Array.isArray(teamA) || !Array.isArray(teamB) || teamA.length === 0 || teamB.length === 0) {
      return NextResponse.json({ success: false, error: 'teamA e teamB devono avere almeno un giocatore' }, { status: 400 });
    }

    const allPlayers: string[] = [...teamA, ...teamB];

    const { data: existingPlayers, error: playersError } = await supabase
      .from('players')
      .select('email')
      .in('email', allPlayers);

    if (playersError) throw playersError;
    if ((existingPlayers?.length || 0) !== allPlayers.length) {
      return NextResponse.json({ success: false, error: 'Uno o più giocatori selezionati non esistono' }, { status: 400 });
    }

    const matchId = `sandbox_${Date.now()}`;

    const { error: matchError } = await supabase.from('matches').insert({
      match_id: matchId,
      match_date: new Date().toISOString().slice(0, 10),
      team_a: teamA,
      team_b: teamB,
      score_a: scoreA ?? 0,
      score_b: scoreB ?? 0,
      completed: true,
      match_status: 'completed',
      location: 'Sandbox di test (admin)',
    });
    if (matchError) throw matchError;

    const statsRows = allPlayers.map((email) => {
      const s: PlayerMatchStats = playerStats?.[email] || {};
      return {
        match_id: matchId,
        player_email: email,
        gol: s.gol || 0,
        assist: s.assist || 0,
        gialli: s.gialli || 0,
        rossi: s.rossi || 0,
      };
    });

    const { error: statsError } = await supabase.from('match_player_stats').insert(statsRows);
    if (statsError) throw statsError;

    // Snapshot player_stats PRIMA di qualsiasi scrittura, per il ripristino esatto in cleanup.
    const { data: snapshot, error: snapshotError } = await supabase
      .from('player_stats')
      .select('*')
      .in('player_email', allPlayers);
    if (snapshotError) throw snapshotError;

    const { error: sessionError } = await supabase.from('sandbox_sessions').insert({
      match_id: matchId,
      snapshot: snapshot || [],
    });
    if (sessionError) throw sessionError;

    // Apre le votazioni (stesso passo che avviene per una partita reale).
    await processAwards(matchId);

    const match = await getMatchByMatchId(matchId);
    const mapped = match ? await mapMatchToApi(match) : null;

    return NextResponse.json({ success: true, matchId, match: mapped });
  } catch (error) {
    console.error('Errore nella creazione della partita sandbox:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nella creazione della partita sandbox', details: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
}
