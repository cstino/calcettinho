import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

// Sostituisce la foto di un giocatore qualsiasi (già attivo), in qualsiasi momento.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);

    const form = await req.formData();
    const photo = form.get('photo');

    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json({ success: false, error: 'Foto obbligatoria' }, { status: 400 });
    }

    const { data: player, error: fetchError } = await supabase
      .from('players')
      .select('email, photo_url')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!player) {
      return NextResponse.json({ success: false, error: 'Giocatore non trovato' }, { status: 404 });
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
      .update({ photo_url: publicUrlData.publicUrl })
      .eq('email', email);

    if (updateError) throw updateError;

    // Pulizia best-effort del file precedente (non bloccante se fallisce).
    const oldPath = player.photo_url?.split('/player-photos/')[1];
    if (oldPath) {
      await supabase.storage.from('player-photos').remove([decodeURIComponent(oldPath)]).catch(() => {});
    }

    return NextResponse.json({ success: true, photoUrl: publicUrlData.publicUrl });
  } catch (error) {
    console.error('Errore sostituzione foto:', error);
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 });
  }
}
