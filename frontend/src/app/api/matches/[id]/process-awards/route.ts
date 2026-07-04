import { NextRequest, NextResponse } from 'next/server';
import { processAwards } from '@/utils/matchEngine';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await params;
    const result = await processAwards(matchId);

    if (!result.success) {
      return NextResponse.json(result, { status: result.error === 'Partita non trovata' ? 404 : 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Errore nel processare premi e statistiche:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Errore nel processare premi immediate e statistiche base',
        details: error instanceof Error ? error.message : 'Errore sconosciuto',
      },
      { status: 500 }
    );
  }
}
