import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data: request, error: fetchError } = await supabase
      .from('registration_requests')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!request) {
      return NextResponse.json({ success: false, error: 'Richiesta non trovata' }, { status: 404 });
    }
    if (request.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Richiesta già gestita' }, { status: 400 });
    }

    const { error } = await supabase
      .from('registration_requests')
      .update({ status: 'rejected', decided_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore rifiuto richiesta:', error);
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 });
  }
}
