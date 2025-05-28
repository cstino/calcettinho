import { NextRequest, NextResponse } from 'next/server';
import { isEmailWhitelisted } from '@/utils/airtable';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email richiesta' 
      }, { status: 400 });
    }

    // Normalizza l'email (lowercase e trim)
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('Verifica whitelist per email:', normalizedEmail);
    
    // Verifica se l'email è nella whitelist
    const isAllowed = await isEmailWhitelisted(normalizedEmail);
    
    console.log('Risultato whitelist:', isAllowed);
    
    if (isAllowed) {
      return NextResponse.json({ 
        success: true, 
        allowed: true,
        message: 'Email autorizzata'
      });
    } else {
      return NextResponse.json({ 
        success: true, 
        allowed: false,
        message: 'Email non autorizzata. Contatta un amministratore per richiedere l\'accesso.'
      });
    }
    
  } catch (error) {
    console.error('Errore nella verifica whitelist:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 