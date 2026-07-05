import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

const USERNAME_RE = /^[A-Za-z0-9_]{2,12}$/;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const email = String(form.get('email') || '').trim().toLowerCase();
    const code = String(form.get('code') || '').trim().toUpperCase();
    const username = String(form.get('username') || '').trim();
    const photo = form.get('photo');

    if (!email || !code) {
      return NextResponse.json({ success: false, error: 'Email e codice sono obbligatori' }, { status: 400 });
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

    const { data: request, error: reqError } = await supabase
      .from('registration_requests')
      .select('*')
      .eq('email', email)
      .eq('status', 'approved')
      .eq('invite_code', code)
      .is('code_used_at', null)
      .maybeSingle();

    if (reqError) throw reqError;

    if (!request) {
      return NextResponse.json({ success: false, error: 'Codice non valido, già usato o email errata' }, { status: 403 });
    }

    const { data: existingPlayer } = await supabase.from('players').select('email').eq('email', email).maybeSingle();
    if (existingPlayer) {
      return NextResponse.json({ success: false, error: 'Registrazione già completata per questa email' }, { status: 409 });
    }

    const { data: usernameTaken } = await supabase.from('players').select('email').eq('username', username).maybeSingle();
    if (usernameTaken) {
      return NextResponse.json({ success: false, error: 'Username già in uso, scegline un altro' }, { status: 409 });
    }

    // Niente encodeURIComponent: è una chiave di storage, non un segmento URL —
    // il client Supabase la codifica lui in getPublicUrl(). Farlo due volte produce
    // un URL pubblico rotto (doppia codifica di "@").
    const ext = photo.type === 'image/png' ? 'png' : 'jpg';
    const path = `${email}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await photo.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('photo-uploads')
      .upload(path, buffer, { contentType: photo.type || 'image/jpeg' });

    if (uploadError) {
      return NextResponse.json({ success: false, error: "Errore nel caricamento della foto" }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from('photo-uploads').getPublicUrl(path);

    const { error: insertError } = await supabase.from('players').insert({
      email,
      name: username,
      username,
      raw_photo_url: publicUrlData.publicUrl,
      status: 'pending_review',
    });

    if (insertError) {
      return NextResponse.json({ success: false, error: 'Errore nella creazione del profilo' }, { status: 500 });
    }

    await supabase
      .from('registration_requests')
      .update({ code_used_at: new Date().toISOString() })
      .eq('id', request.id);

    return NextResponse.json({
      success: true,
      message: 'Registrazione completata! Il tuo profilo sarà attivo dopo la conferma di un amministratore.',
    });
  } catch (error) {
    console.error('Errore nel completamento registrazione:', error);
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 });
  }
}
