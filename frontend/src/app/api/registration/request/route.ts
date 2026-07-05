import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { sendEmail, adminEmail } from '@/utils/email';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { email, note } = await req.json();

    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ success: false, error: 'Email non valida' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: alreadyWhitelisted } = await supabase
      .from('whitelist')
      .select('email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (alreadyWhitelisted) {
      return NextResponse.json(
        { success: false, error: 'Questa email ha già accesso: prova ad accedere dalla pagina di login' },
        { status: 409 }
      );
    }

    const { error: insertError } = await supabase.from('registration_requests').insert({
      email: normalizedEmail,
      note: typeof note === 'string' ? note.slice(0, 500) : null,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'Hai già una richiesta in attesa di conferma' },
          { status: 409 }
        );
      }
      throw insertError;
    }

    const admin = adminEmail();
    if (admin) {
      await sendEmail({
        to: admin,
        subject: 'Calcettinho — Nuova richiesta di accesso',
        html: `
          <p>Nuova richiesta di accesso a Calcettinho:</p>
          <p><b>Email:</b> ${normalizedEmail}</p>
          ${note ? `<p><b>Nota:</b> ${note}</p>` : ''}
          <p>Vai al pannello admin per accettare o rifiutare la richiesta.</p>
        `,
      });
    }

    return NextResponse.json({ success: true, message: 'Richiesta inviata. Riceverai una email quando verrà valutata.' });
  } catch (error) {
    console.error('Errore nella richiesta di registrazione:', error);
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 });
  }
}
