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

export async function GET() {
  try {
    console.log('Recupero tutte le statistiche giocatori da Airtable...');
    
    const records = await base('player_stats').select().all();
    console.log(`Trovate ${records.length} statistiche giocatori`);
    
    const playerStats = records.map((record) => ({
      playerEmail: record.get('playerEmail') as string,
      gol: Number(record.get('Gol')) || 0,
      partiteDisputate: Number(record.get('partiteDisputate')) || 0,
      partiteVinte: Number(record.get('partiteVinte')) || 0,
      partitePareggiate: Number(record.get('partitePareggiate')) || 0,
      partitePerse: Number(record.get('partitePerse')) || 0,
      assistenze: Number(record.get('assistenze')) || 0,
      cartelliniGialli: Number(record.get('cartelliniGialli')) || 0,
      cartelliniRossi: Number(record.get('cartelliniRossi')) || 0
    }));
    
    console.log(`Statistiche processate: ${playerStats.length}`);
    return NextResponse.json(playerStats);
    
  } catch (error) {
    console.error('Errore nel recupero statistiche giocatori:', error);
    
    // Restituisce array vuoto in caso di errore
    return NextResponse.json([]);
  }
}