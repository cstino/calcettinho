import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { getMatchByMatchId, mapMatchToApi, replaceMatchPlayerStats } from '@/utils/matches';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: false });

    if (error) throw error;

    const matches = await Promise.all((data || []).map((row) => mapMatchToApi(row)));

    return NextResponse.json(matches);
  } catch (error) {
    console.error('Errore nel recupero delle partite:', error);
    return NextResponse.json({ error: 'Errore nel recupero delle partite' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, teamA, teamB, referee } = body;

    if (!date || !teamA || !teamB) {
      return NextResponse.json(
        { error: 'Dati mancanti: data, teamA e teamB sono obbligatori' },
        { status: 400 }
      );
    }

    if (!Array.isArray(teamA) || !Array.isArray(teamB)) {
      return NextResponse.json({ error: 'teamA e teamB devono essere array di email' }, { status: 400 });
    }

    if (teamA.length === 0 || teamB.length === 0) {
      return NextResponse.json({ error: 'Ogni squadra deve avere almeno un giocatore' }, { status: 400 });
    }

    const matchId = `match_${Date.now()}`;

    const { error } = await supabase.from('matches').insert({
      match_id: matchId,
      match_date: date,
      team_a: teamA,
      team_b: teamB,
      completed: false,
      match_status: 'scheduled',
      referee: referee || null,
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      match: {
        id: matchId,
        matchId,
        date,
        teamA,
        teamB,
        completed: false,
        match_status: 'scheduled',
        referee: referee || '',
      },
    });
  } catch (error) {
    console.error('Errore nella creazione della partita:', error);
    return NextResponse.json(
      { error: `Errore nella creazione della partita: ${error instanceof Error ? error.message : 'Errore sconosciuto'}` },
      { status: 500 }
    );
  }
}

// Aggiorna una partita passando il matchId nel body (usato da MatchResultModal).
// Equivalente a PUT /api/matches/{id}, mantenuto per compatibilità con le chiamate esistenti.
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, scoreA, scoreB, teamAScorer, teamBScorer, assistA, assistB, playerStats, completed, match_status, referee } = body;

    if (!matchId) {
      return NextResponse.json({ error: 'ID partita mancante' }, { status: 400 });
    }

    const existing = await getMatchByMatchId(matchId);
    if (!existing) {
      return NextResponse.json({ error: 'Partita non trovata' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.date !== undefined) updateData.match_date = body.date;
    if (body.teamA !== undefined) updateData.team_a = body.teamA;
    if (body.teamB !== undefined) updateData.team_b = body.teamB;
    if (scoreA !== undefined) updateData.score_a = scoreA;
    if (scoreB !== undefined) updateData.score_b = scoreB;
    if (teamAScorer !== undefined) updateData.team_a_scorer = teamAScorer;
    if (teamBScorer !== undefined) updateData.team_b_scorer = teamBScorer;
    if (assistA !== undefined) updateData.assist_a = assistA;
    if (assistB !== undefined) updateData.assist_b = assistB;
    if (completed !== undefined) updateData.completed = completed;
    if (match_status !== undefined) updateData.match_status = match_status;
    if (referee !== undefined) updateData.referee = referee;

    const { error: updateError } = await supabase.from('matches').update(updateData).eq('match_id', matchId);
    if (updateError) throw updateError;

    if (playerStats !== undefined) {
      await replaceMatchPlayerStats(matchId, playerStats);
    }

    const updated = await getMatchByMatchId(matchId);
    const updatedMatch = await mapMatchToApi(updated!);

    return NextResponse.json({ success: true, match: updatedMatch });
  } catch (error) {
    console.error("Errore nell'aggiornamento della partita:", error);
    return NextResponse.json(
      { error: `Errore nell'aggiornamento della partita: ${error instanceof Error ? error.message : 'Errore sconosciuto'}` },
      { status: 500 }
    );
  }
}
