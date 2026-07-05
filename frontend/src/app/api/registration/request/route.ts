import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { sendEmail, adminEmail } from '@/utils/email';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[A-Za-z0-9_]{2,12}$/;

// Richiesta di accesso "tutto in uno": email, nome e cognome, username scelto per la
// card e foto, in un'unica sottomissione. L'admin approva/rifiuta dal pannello; se
// approva, il profilo viene creato subito (nessun codice da inserire in un secondo momento).
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const email = String(form.get('email') || '').trim().toLowerCase();
    const fullName = String(form.get('fullName') || '').trim();
    const username = String(form.get('username') || '').trim();
    const photo = form.get('photo');

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ success: false, error: 'Email non valida' }, { status: 400 });
    }
    if (!fullName) {
      return NextResponse.json({ success: false, error: 'Nome e cognome obbligatori' }, { status: 400 });
    }
    if (!USERNAME_RE.test(username)) {
      return NextResponse.json(
        { success: false, error: 'Username non valido: 2-12 caratteri, solo lettere, numeri e underscore' },
        { status: 400 }
      );
    }
    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json({ success: false, error: 'Foto obbligatoria' }, { status: 400 });
    }

    const { data: alreadyWhitelisted } = await supabase
      .from('whitelist')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (alreadyWhitelisted) {
      return NextResponse.json(
        { success: false, error: 'Questa email ha già accesso: prova ad accedere dalla pagina di login' },
        { status: 409 }
      );
    }

    const { data: usernameTaken } = await supabase.from('players').select('email').eq('username', username).maybeSingle();
    if (usernameTaken) {
      return NextResponse.json({ success: false, error: 'Username già in uso, scegline un altro' }, { status: 409 });
    }

    const ext = photo.type === 'image/png' ? 'png' : 'jpg';
    const path = `${email}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await photo.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('photo-uploads')
      .upload(path, buffer, { contentType: photo.type || 'image/jpeg' });

    if (uploadError) {
      return NextResponse.json({ success: false, error: 'Errore nel caricamento della foto' }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from('photo-uploads').getPublicUrl(path);

    const { error: insertError } = await supabase.from('registration_requests').insert({
      email,
      full_name: fullName.slice(0, 100),
      username,
      raw_photo_url: publicUrlData.publicUrl,
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
          <p><b>Nome:</b> ${fullName}</p>
          <p><b>Username card:</b> ${username}</p>
          <p><b>Email:</b> ${email}</p>
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
