import { NextResponse } from 'next/server';
import Airtable from 'airtable';

export async function GET() {
  try {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    console.log('Test Airtable - API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MANCANTE');
    console.log('Test Airtable - Base ID:', baseId);
    
    if (!apiKey || !baseId) {
      return NextResponse.json({
        error: 'Credenziali Airtable mancanti',
        apiKey: !!apiKey,
        baseId: !!baseId
      }, { status: 400 });
    }
    
    // Configura Airtable
    Airtable.configure({
      endpointUrl: 'https://api.airtable.com',
      apiKey: apiKey
    });
    
    const base = Airtable.base(baseId);
    
    // Test: prova a listare le tabelle/ottenere un record
    const records = await base('players').select({ maxRecords: 1 }).all();
    
    return NextResponse.json({
      success: true,
      message: 'Connessione Airtable OK',
      recordsFound: records.length,
      firstRecord: records.length > 0 ? {
        id: records[0].id,
        fields: records[0].fields
      } : null
    });
    
  } catch (error) {
    console.error('Errore test Airtable:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 