import { NextResponse } from 'next/server';
import { getPlayers } from '@/utils/supabase';

export async function GET() {
  try {
    const players = await getPlayers();

    return NextResponse.json(
      players.map((p) => ({
        nome: p.nome,
        email: p.email,
        foto: p.foto,
        ATT: p.ATT,
        DIF: p.DEF,
        VEL: p.VEL,
        PAS: p.PAS,
        FOR: p.FOR,
        POR: p.POR,
      }))
    );
  } catch (error) {
    console.error('Errore nel recupero giocatori da Supabase:', error);
    return NextResponse.json([], { status: 500 });
  }
}
