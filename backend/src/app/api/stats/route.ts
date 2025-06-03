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
    console.log('Recupero statistiche aggregate di tutti i giocatori...');
    
    // Recupera tutti i giocatori
    const playersRecords = await base('players').select().all();
    console.log(`Trovati ${playersRecords.length} giocatori`);
    
    // Recupera tutte le statistiche
    const statsRecords = await base('player_stats').select().all();
    console.log(`Trovate ${statsRecords.length} statistiche`);
    
    // Mappa le statistiche per email per un accesso veloce
    const statsMap = new Map();
    statsRecords.forEach(record => {
      const email = record.get('playerEmail');
      if (email) {
        statsMap.set(email, {
          gol: Number(record.get('Gol')) || 0,
          partiteDisputate: Number(record.get('partiteDisputate')) || 0,
          partiteVinte: Number(record.get('partiteVinte')) || 0,
          partitePareggiate: Number(record.get('partitePareggiate')) || 0,
          partitePerse: Number(record.get('partitePerse')) || 0,
          assistenze: Number(record.get('assistenze')) || 0,
          cartelliniGialli: Number(record.get('cartelliniGialli')) || 0,
          cartelliniRossi: Number(record.get('cartelliniRossi')) || 0
        });
      }
    });
    
    // Combina giocatori con le loro statistiche
    const playersWithStats = playersRecords
      .filter(player => {
        const name = player.get('name');
        return name && typeof name === 'string' && name.trim() !== '';
      })
      .map((player, index) => {
        const email = player.get('email');
        const stats = statsMap.get(email) || {
          gol: 0,
          partiteDisputate: 0,
          partiteVinte: 0,
          partitePareggiate: 0,
          partitePerse: 0,
          assistenze: 0,
          cartelliniGialli: 0,
          cartelliniRossi: 0
        };
        
        // Calcola overall dalla tabella players
        const overall = Math.round((
          Number(player.get('Attacco')) + 
          Number(player.get('Difesa')) + 
          Number(player.get('Velocità')) + 
          Number(player.get('Forza')) + 
          Number(player.get('Passaggio')) + 
          Number(player.get('Portiere'))
        ) / 6);
        
        return {
          id: (index + 1).toString(),
          name: player.get('name'),
          email: email,
          matches: stats.partiteDisputate,
          wins: stats.partiteVinte,
          losses: stats.partitePerse,
          draws: stats.partitePareggiate,
          goals: stats.gol,
          assists: stats.assistenze,
          yellowCards: stats.cartelliniGialli,
          redCards: stats.cartelliniRossi,
          overall: overall
        };
      });
    
    console.log(`Statistiche aggregate preparate per ${playersWithStats.length} giocatori`);
    
    const response = NextResponse.json(playersWithStats);
    
    // Aggiungi header CORS
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
    
  } catch (error) {
    console.error('Errore nel recupero statistiche aggregate:', error);
    
    // Fallback con dati vuoti in caso di errore
    const response = NextResponse.json([]);
    
    // Aggiungi header CORS anche per i dati di fallback
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  }
} 