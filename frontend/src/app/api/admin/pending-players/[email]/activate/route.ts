import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { sendEmail } from '@/utils/email';

export async function POST(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);

    const form = await req.formData();
    const photo = form.get('photo');

    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json({ success: false, error: 'Foto curata obbligatoria' }, { status: 400 });
    }

    const { data: player, error: fetchError } = await supabase
      .from('players')
      .select('email, name, status')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!player) {
      return NextResponse.json({ success: false, error: 'Giocatore non trovato' }, { status: 404 });
    }
    if (player.status !== 'pending_review') {
      return NextResponse.json({ success: false, error: 'Giocatore non in attesa di conferma' }, { status: 400 });
    }

    // Niente encodeURIComponent: è una chiave di storage, non un segmento URL —
    // il client Supabase la codifica lui in getPublicUrl(). Farlo due volte produce
    // un URL pubblico rotto (doppia codifica di "@").
    // Nome file univoco (non upsert sullo stesso nome): altrimenti la CDN di
    // Supabase Storage potrebbe continuare a servire i byte vecchi sullo stesso URL.
    const ext = photo.type === 'image/png' ? 'png' : 'jpg';
    const path = `${email}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await photo.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('player-photos')
      .upload(path, buffer, { contentType: photo.type || 'image/jpeg' });

    if (uploadError) {
      return NextResponse.json({ success: false, error: 'Errore nel caricamento della foto' }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from('player-photos').getPublicUrl(path);

    const { error: updateError } = await supabase
      .from('players')
      .update({ photo_url: publicUrlData.publicUrl, status: 'active' })
      .eq('email', email);

    if (updateError) throw updateError;

    await sendEmail({
      to: email,
      subject: 'Calcettinho — Il tuo profilo è pronto!',
      html: `
        <p>Ciao ${player.name},</p>
        <p>La tua card è pronta ed è ora attiva su Calcettinho. Accedi con la tua email dalla pagina di login.</p>
      `,
    });

    return NextResponse.json({ success: true, message: 'Giocatore attivato, card ora live' });
  } catch (error) {
    console.error('Errore attivazione giocatore:', error);
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 });
  }
}
