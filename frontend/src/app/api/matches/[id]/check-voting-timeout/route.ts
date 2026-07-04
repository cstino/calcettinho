import { NextRequest, NextResponse } from 'next/server';
import { checkVotingTimeout } from '@/utils/matchEngine';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await params;
    const result = await checkVotingTimeout(matchId);

    if (!result.success) {
      return NextResponse.json(result, { status: result.error === 'Partita non trovata' ? 404 : 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Errore nel controllo timeout votazioni:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Errore nel controllo timeout votazioni',
        details: error instanceof Error ? error.message : 'Errore sconosciuto',
      },
      { status: 500 }
    );
  }
}
