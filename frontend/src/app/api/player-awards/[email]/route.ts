import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);

    const { data, error } = await supabase
      .from('player_awards')
      .select('*')
      .eq('player_email', decodedEmail);

    if (error) throw error;

    const awards = (data || []).map((record) => ({
      id: record.id,
      awardType: record.award_type,
      matchId: record.match_id,
      status: record.status,
      unlockedAt: record.unlocked_at,
      selected: record.selected === true,
      createdAt: record.created_at,
    }));

    const pendingAwards = awards.filter((a) => a.status === 'pending');
    const unlockedAwards = awards.filter((a) => a.status === 'unlocked');
    const selectedAward = awards.find((a) => a.selected);

    return NextResponse.json({
      total: awards.length,
      pending: pendingAwards.length,
      unlocked: unlockedAwards.length,
      awards,
      pendingAwards,
      unlockedAwards,
      selectedCard: selectedAward || null,
    });
  } catch (error) {
    console.error('Errore nel recupero premi giocatore:', error);
    return NextResponse.json({
      total: 0,
      pending: 0,
      unlocked: 0,
      awards: [],
      pendingAwards: [],
      unlockedAwards: [],
      selectedCard: null,
    });
  }
}

// Sblocca un premio (da pending a unlocked)
export async function POST(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);
    const { awardId } = await request.json();

    const { data: record, error } = await supabase
      .from('player_awards')
      .select('*')
      .eq('player_email', decodedEmail)
      .eq('id', awardId)
      .maybeSingle();

    if (error) throw error;

    if (!record) {
      return NextResponse.json({ success: false, error: 'Premio non trovato' }, { status: 404 });
    }

    if (record.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Premio già sbloccato o in stato non valido' },
        { status: 400 }
      );
    }

    await supabase
      .from('player_awards')
      .update({ status: 'unlocked', unlocked_at: new Date().toISOString() })
      .eq('id', awardId);

    return NextResponse.json({
      success: true,
      message: 'Premio sbloccato con successo',
      awardId,
      awardType: record.award_type,
    });
  } catch (error) {
    console.error('Errore nello sblocco premio:', error);
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 });
  }
}

// Imposta la card selezionata come retro del profilo
export async function PUT(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);
    const { awardId } = await request.json();

    await supabase.from('player_awards').update({ selected: false }).eq('player_email', decodedEmail);

    if (awardId === null) {
      return NextResponse.json({ success: true, message: 'Card base selezionata come retro' });
    }

    const { data: targetRecord, error } = await supabase
      .from('player_awards')
      .select('*')
      .eq('player_email', decodedEmail)
      .eq('id', awardId)
      .maybeSingle();

    if (error) throw error;

    if (!targetRecord) {
      return NextResponse.json({ success: false, error: 'Premio non trovato' }, { status: 404 });
    }

    if (targetRecord.status !== 'unlocked') {
      return NextResponse.json(
        { success: false, error: 'Impossibile selezionare una card non sbloccata' },
        { status: 400 }
      );
    }

    await supabase.from('player_awards').update({ selected: true }).eq('id', awardId);

    return NextResponse.json({
      success: true,
      message: 'Card selezionata come retro',
      selectedCard: { id: awardId, awardType: targetRecord.award_type },
    });
  } catch (error) {
    console.error('Errore nella selezione card:', error);
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 });
  }
}
