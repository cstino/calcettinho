import { NextResponse } from 'next/server';
import { getPlayers } from '@/utils/supabase';

export async function GET() {
  try {
    const players = await getPlayers();

    return NextResponse.json(
      players.map((p) => ({
        nome: p.nome,
        email: p.email,
        foto: p.photoUrl,
        ATT: p.ATT,
        PAS: p.PAS,
        DIF: p.DIF,
        POR: p.POR,
        overall: p.overall,
        tier: p.tier,
        ranked: p.ranked,
        rkMatches: p.rkMatches,
        selectedFrame: p.selectedFrame,
      }))
    );
  } catch (error) {
    console.error('Errore nel recupero giocatori da Supabase:', error);
    return NextResponse.json([], { status: 500 });
  }
}
