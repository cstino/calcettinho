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
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const email = decodeURIComponent(params.email);
    console.log(`Recupero statistiche per giocatore: ${email}`);
    
    // Cerca le statistiche per l'email specificata
    const records = await base('player_stats').select({
      filterByFormula: `{playerEmail} = "${email}"`
    }).all();
    
    if (records.length === 0) {
      console.log(`Nessuna statistica trovata per ${email}, restituisco valori default`);
      
      // Restituisce statistiche di default se non trovate
      return NextResponse.json({
        gol: 0,
        partiteDisputate: 0,
        partiteVinte: 0,
        partitePareggiate: 0,
        partitePerse: 0,
        assistenze: 0,
        cartelliniGialli: 0,
        cartelliniRossi: 0,
        minutiGiocati: 0
      });
    }
    
    const record = records[0];
    const stats = {
      gol: Number(record.get('gol')) || Number(record.get('Gol')) || 0,
      partiteDisputate: Number(record.get('partiteDisputate')) || 0,
      partiteVinte: Number(record.get('partiteVinte')) || 0,
      partitePareggiate: Number(record.get('partitePareggiate')) || 0,
      partitePerse: Number(record.get('partitePerse')) || 0,
      assistenze: Number(record.get('assistenze')) || 0,
      cartelliniGialli: Number(record.get('cartelliniGialli')) || 0,
      cartelliniRossi: Number(record.get('cartelliniRossi')) || 0,
      minutiGiocati: Number(record.get('minutiGiocati')) || 0
    };
    
    console.log(`Statistiche trovate per ${email}:`, stats);
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('Errore nel recupero statistiche giocatore:', error);
    
    // Fallback con statistiche vuote in caso di errore
    return NextResponse.json({
      gol: 0,
      partiteDisputate: 0,
      partiteVinte: 0,
      partitePareggiate: 0,
      partitePerse: 0,
      assistenze: 0,
      cartelliniGialli: 0,
      cartelliniRossi: 0,
      minutiGiocati: 0
    });
  }
} 