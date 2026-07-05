import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { sendEmail } from '@/utils/email';

// Approvazione diretta: la richiesta contiene già nome, username e foto, quindi
// accettare crea subito il profilo (status pending_review, in attesa che l'admin
// carichi la foto curata dalla tab "Registrazioni"). Nessun codice da inserire.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data: request, error: fetchError } = await supabase
      .from('registration_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!request) {
      return NextResponse.json({ success: false, error: 'Richiesta non trovata' }, { status: 404 });
    }
    if (request.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Richiesta già gestita' }, { status: 400 });
    }
    if (!request.username || !request.full_name || !request.raw_photo_url) {
      return NextResponse.json({ success: false, error: 'Richiesta incompleta (dati legacy senza username/foto)' }, { status: 400 });
    }

    const { data: usernameTaken } = await supabase
      .from('players')
      .select('email')
      .eq('username', request.username)
      .maybeSingle();

    if (usernameTaken) {
      return NextResponse.json(
        { success: false, error: `Username "${request.username}" già in uso da un altro giocatore` },
        { status: 409 }
      );
    }

    const { error: whitelistError } = await supabase
      .from('whitelist')
      .upsert({ email: request.email, role: 'user' }, { onConflict: 'email' });
    if (whitelistError) throw whitelistError;

    const { error: playerError } = await supabase.from('players').insert({
      email: request.email,
      name: request.full_name,
      username: request.username,
      raw_photo_url: request.raw_photo_url,
      status: 'pending_review',
    });
    if (playerError) throw playerError;

    const { error: updateError } = await supabase
      .from('registration_requests')
      .update({ status: 'approved', decided_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) throw updateError;

    await sendEmail({
      to: request.email,
      subject: 'Calcettinho — Accesso approvato',
      html: `
        <p>Ciao ${request.full_name},</p>
        <p>La tua richiesta di accesso a Calcettinho è stata approvata!</p>
        <p>Il tuo profilo (<b>${request.username}</b>) sarà attivo a breve, appena un amministratore avrà rifinito la tua foto per la card.</p>
        <p>Riceverai un'altra email quando sarà tutto pronto per accedere.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore approvazione richiesta:', error);
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 });
  }
}
