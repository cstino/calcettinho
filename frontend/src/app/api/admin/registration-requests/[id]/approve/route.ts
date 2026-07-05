import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { sendEmail } from '@/utils/email';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // niente 0/O/1/I per leggibilità

function generateInviteCode(length = 8): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

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

    const inviteCode = generateInviteCode();

    const { error: updateError } = await supabase
      .from('registration_requests')
      .update({ status: 'approved', invite_code: inviteCode, decided_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) throw updateError;

    const { error: whitelistError } = await supabase
      .from('whitelist')
      .upsert({ email: request.email, role: 'user' }, { onConflict: 'email' });

    if (whitelistError) throw whitelistError;

    await sendEmail({
      to: request.email,
      subject: 'Calcettinho — Accesso approvato',
      html: `
        <p>La tua richiesta di accesso a Calcettinho è stata approvata!</p>
        <p>Il tuo codice di accesso è: <b style="font-size:20px; letter-spacing:2px;">${inviteCode}</b></p>
        <p>Usalo per completare la registrazione (username + foto) sulla pagina di registrazione dell'app.</p>
      `,
    });

    return NextResponse.json({ success: true, inviteCode });
  } catch (error) {
    console.error('Errore approvazione richiesta:', error);
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 });
  }
}
