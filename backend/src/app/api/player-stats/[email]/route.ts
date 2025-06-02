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
    
    // DEBUG: Prima recupera tutti i record per vedere la struttura
    const allRecords = await base('player_stats').select({
      maxRecords: 5
    }).all();
    
    console.log('DEBUG - Tutti i record disponibili:');
    allRecords.forEach((record, index) => {
      console.log(`Record ${index}:`, record.fields);
    });
    
    // Cerca le statistiche per l'email specificata
    const records = await base('player_stats').select({
      filterByFormula: `{playerEmail} = "${email}"`
    }).all();
    
    console.log(`Trovati ${records.length} record per ${email}`);
    
    // Se non trova con playerEmail, prova con altri possibili nomi di colonna
    if (records.length === 0) {
      console.log('Tentativo con filtro alternativo...');
      const alternativeRecords = await base('player_stats').select({
        filterByFormula: `{email} = "${email}"` // Prova con "email" invece di "playerEmail"
      }).all();
      
      console.log(`Trovati ${alternativeRecords.length} record con filtro alternativo`);
      
      if (alternativeRecords.length === 0) {
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
          cartelliniRossi: 0
        });
      }
      
      // Usa il record alternativo
      const record = alternativeRecords[0];
      console.log('Record alternativo trovato:', record.fields);
      
      const stats = {
        gol: Number(record.get('Gol')) || 0,
        partiteDisputate: Number(record.get('partiteDisputate')) || 0,
        partiteVinte: Number(record.get('partiteVinte')) || 0,
        partitePareggiate: Number(record.get('partitePareggiate')) || 0,
        partitePerse: Number(record.get('partitePerse')) || 0,
        assistenze: Number(record.get('assistenze')) || 0,
        cartelliniGialli: Number(record.get('cartelliniGialli')) || 0,
        cartelliniRossi: Number(record.get('cartelliniRossi')) || 0
      };
      
      console.log(`Statistiche mappate (alternativo) per ${email}:`, stats);
      return NextResponse.json(stats);
    }
    
    const record = records[0];
    console.log('Record trovato:', record.fields);
    
    const stats = {
      gol: Number(record.get('Gol')) || 0,
      partiteDisputate: Number(record.get('partiteDisputate')) || 0,
      partiteVinte: Number(record.get('partiteVinte')) || 0,
      partitePareggiate: Number(record.get('partitePareggiate')) || 0,
      partitePerse: Number(record.get('partitePerse')) || 0,
      assistenze: Number(record.get('assistenze')) || 0,
      cartelliniGialli: Number(record.get('cartelliniGialli')) || 0,
      cartelliniRossi: Number(record.get('cartelliniRossi')) || 0
    };
    
    console.log(`Statistiche mappate per ${email}:`, stats);
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
      cartelliniRossi: 0
    });
  }
} 