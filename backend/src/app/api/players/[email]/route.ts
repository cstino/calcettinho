import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurazione Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('Credenziali Airtable mancanti nelle variabili d\'ambiente');
}

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: apiKey
});

const base = Airtable.base(baseId);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Await dei parametri per Next.js 15
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);
    
    console.log('Richiesta foto per email:', email);
    
    // Cerca il giocatore in Airtable
    const records = await base('players').select({
      filterByFormula: `{email} = '${email}'`
    }).all();
    
    if (records.length === 0) {
      console.log('Giocatore non trovato per email:', email);
      return new NextResponse('Giocatore non trovato', { status: 404 });
    }
    
    const record = records[0];
    
    // Gestisce il campo photoUrl come attachment di Airtable
    const photoAttachments = record.get('photoUrl') as any[];
    
    if (photoAttachments && Array.isArray(photoAttachments) && photoAttachments.length > 0) {
      const photoUrl = photoAttachments[0].url;
      console.log(`Foto trovata per ${email}: ${photoUrl}`);
      
      // Scarica l'immagine da Airtable e la serve
      const response = await fetch(photoUrl);
      if (response.ok) {
        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        return new NextResponse(Buffer.from(imageBuffer), {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600', // Cache per 1 ora
          },
        });
      }
    }
    
    console.log(`Nessuna foto disponibile per ${email}`);
    return new NextResponse('Foto non disponibile', { status: 404 });
    
  } catch (error) {
    console.error('Errore nel recupero della foto:', error);
    return new NextResponse('Errore interno del server', { status: 500 });
  }
} 