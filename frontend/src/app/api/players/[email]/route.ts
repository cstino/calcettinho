import { NextRequest, NextResponse } from 'next/server';
import { getPlayerIdentity } from '@/utils/supabase';

// Serve la foto profilo del giocatore. Se il giocatore non ha una foto su Supabase Storage,
// fa fallback sul file statico /players/{email}.jpg (stesso comportamento della produzione attuale).
export async function GET(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const { email: emailParam } = await params;
  const email = decodeURIComponent(emailParam);
  const staticFallbackUrl = new URL(`/players/${encodeURIComponent(email)}.jpg`, req.url);

  try {
    const player = await getPlayerIdentity(email);

    if (!player || !player.photoUrl) {
      return NextResponse.redirect(staticFallbackUrl, { status: 302 });
    }

    const imageResponse = await fetch(player.photoUrl);
    if (!imageResponse.ok) {
      return NextResponse.redirect(staticFallbackUrl, { status: 302 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(Buffer.from(imageBuffer), {
      headers: {
        'Content-Type': contentType,
        // Niente cache: il server rilegge photo_url ad ogni richiesta, ma con una
        // Cache-Control lunga il browser/CDN non richiederebbe nemmeno una foto
        // appena sostituita dall'admin per un'ora intera.
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Errore nel recupero della foto:', error);
    return NextResponse.redirect(staticFallbackUrl, { status: 302 });
  }
}
