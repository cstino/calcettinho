import { NextRequest, NextResponse } from 'next/server';
import { finalizeVoting } from '@/utils/matchEngine';

export async function POST(req: NextRequest) {
  try {
    const { matchId } = await req.json();

    if (!matchId) {
      return NextResponse.json({ success: false, error: 'matchId richiesto' }, { status: 400 });
    }

    const result = await finalizeVoting(matchId, { force: true });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Partita finalizzata forzatamente con successo',
        matchId,
        motmAwarded: result.motmAwards || 0,
        playersUpdated: result.playersUpdated || 0,
        details: result,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Errore nella finalizzazione forzata', details: result.error, matchId },
      { status: 500 }
    );
  } catch (error) {
    console.error('Errore durante finalizzazione forzata:', error);
    return NextResponse.json(
      { success: false, error: 'Errore durante finalizzazione forzata', details: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
}
