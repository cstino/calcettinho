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
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Errore nel recupero della foto:', error);
    return NextResponse.redirect(staticFallbackUrl, { status: 302 });
  }
}
