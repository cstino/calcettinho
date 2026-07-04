import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { getMatchByMatchId, mapMatchToApi, replaceMatchPlayerStats } from '@/utils/matches';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await params;
    const match = await getMatchByMatchId(matchId);

    if (!match) {
      return NextResponse.json({ error: 'Partita non trovata' }, { status: 404 });
    }

    return NextResponse.json(await mapMatchToApi(match));
  } catch (error) {
    console.error('Errore nel recupero della partita:', error);
    return NextResponse.json({ error: 'Errore nel recupero della partita' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await params;
    const body = await request.json();

    const existing = await getMatchByMatchId(matchId);
    if (!existing) {
      return NextResponse.json({ error: 'Partita non trovata' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.date !== undefined) updateData.match_date = body.date;
    if (body.teamA !== undefined) updateData.team_a = body.teamA;
    if (body.teamB !== undefined) updateData.team_b = body.teamB;
    if (body.scoreA !== undefined) updateData.score_a = body.scoreA;
    if (body.scoreB !== undefined) updateData.score_b = body.scoreB;
    if (body.teamAScorer !== undefined) updateData.team_a_scorer = body.teamAScorer;
    if (body.teamBScorer !== undefined) updateData.team_b_scorer = body.teamBScorer;
    if (body.assistA !== undefined) updateData.assist_a = body.assistA;
    if (body.assistB !== undefined) updateData.assist_b = body.assistB;
    if (body.completed !== undefined) updateData.completed = body.completed;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.match_status !== undefined) updateData.match_status = body.match_status;
    if (body.referee !== undefined) updateData.referee = body.referee;

    const { error: updateError } = await supabase.from('matches').update(updateData).eq('match_id', matchId);
    if (updateError) throw updateError;

    if (body.playerStats !== undefined) {
      await replaceMatchPlayerStats(matchId, body.playerStats);
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await params;

    const existing = await getMatchByMatchId(matchId);
    if (!existing) {
      return NextResponse.json({ error: 'Partita non trovata' }, { status: 404 });
    }

    const { error } = await supabase.from('matches').delete().eq('match_id', matchId);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Partita eliminata con successo' });
  } catch (error) {
    console.error("Errore nell'eliminazione della partita:", error);
    return NextResponse.json(
      { error: `Errore nell'eliminazione della partita: ${error instanceof Error ? error.message : 'Errore sconosciuto'}` },
      { status: 500 }
    );
  }
}
