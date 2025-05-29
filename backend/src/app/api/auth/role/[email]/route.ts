import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurazione Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('Credenziali Airtable mancanti');
}

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: apiKey
});

const base = Airtable.base(baseId);

export async function GET(req: NextRequest, { params }: { params: { email: string } }) {
  try {
    const email = decodeURIComponent(params.email);
    
    console.log('🔍 Controllo ruolo per:', email);

    // Cerca l'utente nella tabella whitelist
    const records = await base('whitelist').select({
      filterByFormula: `{email} = "${email}"`
    }).firstPage();

    if (records.length === 0) {
      console.log('❌ Utente non trovato in whitelist:', email);
      return NextResponse.json({ 
        success: false, 
        error: 'Utente non autorizzato',
        role: null,
        isAdmin: false
      }, { status: 403 });
    }

    const userRecord = records[0];
    const roleField = userRecord.fields.Role;
    const role = typeof roleField === 'string' ? roleField : 'user'; // Default a 'user' se non specificato
    const isAdmin = role.toLowerCase() === 'admin';

    console.log('✅ Ruolo trovato:', { email, role, isAdmin });

    return NextResponse.json({
      success: true,
      email,
      role,
      isAdmin,
      message: `Utente ${email} ha ruolo: ${role}`
    });

  } catch (error) {
    console.error('❌ Errore nel controllo ruolo:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Errore sconosciuto',
      role: null,
      isAdmin: false
    }, { status: 500 });
  }
} 