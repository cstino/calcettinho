import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { getMatchByMatchId, mapMatchToApi } from '@/utils/matches';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await params;

    const match = await getMatchByMatchId(matchId);
    if (!match) {
      return NextResponse.json({ error: 'Partita non trovata' }, { status: 404 });
    }

    if (match.completed === true) {
      return NextResponse.json({ error: 'Impossibile avviare la partita. La partita è già completata.' }, { status: 400 });
    }

    if (match.match_status === 'in_progress') {
      return NextResponse.json({ error: 'La partita è già in corso.' }, { status: 400 });
    }

    if (match.match_status && match.match_status !== 'scheduled') {
      return NextResponse.json(
        { error: `Impossibile avviare la partita. Status attuale: ${match.match_status}` },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('matches').update({ match_status: 'in_progress' }).eq('match_id', matchId);
    if (error) throw error;

    const updated = await getMatchByMatchId(matchId);
    const updatedMatch = await mapMatchToApi(updated!);

    return NextResponse.json({ success: true, message: 'Partita avviata con successo', match: updatedMatch });
  } catch (error) {
    console.error("Errore nell'avvio della partita:", error);
    return NextResponse.json(
      { error: `Errore nell'avvio della partita: ${error instanceof Error ? error.message : 'Errore sconosciuto'}` },
      { status: 500 }
    );
  }
}
