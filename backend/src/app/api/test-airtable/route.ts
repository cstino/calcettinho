import { NextResponse } from 'next/server';
import { testTableAccess } from '@/utils/airtable';

export async function GET() {
  try {
    console.log('🔍 Inizio test accesso tabelle Airtable...');
    
    // Esegui il test delle tabelle
    await testTableAccess();
    
    return NextResponse.json({ 
      success: true,
      message: 'Test completato. Controlla i log per i dettagli.'
    });
  } catch (error) {
    console.error('Errore durante il test Airtable:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
} 