import { NextRequest, NextResponse } from 'next/server';
import { finalizeVoting } from '@/utils/matchEngine';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await params;
    const body = await req.json().catch(() => ({}));
    const isForced = body.force === true;

    const result = await finalizeVoting(matchId, { force: isForced });

    if (!result.success) {
      const status = result.status === 'waiting' ? 400 : result.error === 'Partita non trovata' ? 404 : 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Errore nel finalizzare votazioni:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel finalizzare votazioni', details: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
}
