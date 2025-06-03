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
    console.log('Recupero giocatori da Airtable...');
    
    const records = await base('players').select().all();
    console.log(`Trovati ${records.length} giocatori in Airtable`);
    
    const players = records.map((record, index) => {
      const nome = record.get('name') as string || `Giocatore_${index + 1}`;
      const email = record.get('email') as string || `email${index}@example.com`;
      
      // Gestisce il campo photoUrl come attachment di Airtable
      const photoAttachments = record.get('photoUrl') as any[];
      let fotoUrl = '';
      
      if (photoAttachments && Array.isArray(photoAttachments) && photoAttachments.length > 0) {
        // Prende il primo attachment se presente
        fotoUrl = photoAttachments[0].url || '';
        console.log(`Foto trovata per ${nome}: ${fotoUrl}`);
      } else {
        console.log(`Nessuna foto per ${nome}`);
      }
      
      return {
        nome,
        email,
        foto: fotoUrl,
        ATT: Number(record.get('Attacco')) || 50,
        DIF: Number(record.get('Difesa')) || 50,
        VEL: Number(record.get('Velocità')) || 50,
        PAS: Number(record.get('Passaggio')) || 50,
        FOR: Number(record.get('Forza')) || 50,
        POR: Number(record.get('Portiere')) || 50,
      };
    });
    
    console.log(`Giocatori processati: ${players.length}`);
    
    const response = NextResponse.json(players);
    
    // Aggiungi header CORS
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
    
  } catch (error) {
    console.error('Errore nel recupero giocatori da Airtable:', error);
    
    // Dati di fallback in caso di errore
    const fallbackPlayers = [
      { 
        nome: "Marco Rossi", 
        email: "marco.rossi@email.com", 
        foto: "", 
        ATT: 85, 
        DIF: 70, 
        VEL: 80, 
        FOR: 88, 
        PAS: 75, 
        POR: 65 
      },
      { 
        nome: "Luca Bianchi", 
        email: "luca.bianchi@email.com", 
        foto: "", 
        ATT: 90, 
        DIF: 65, 
        VEL: 95, 
        FOR: 70, 
        PAS: 80, 
        POR: 55 
      },
      { 
        nome: "Giuseppe Verdi", 
        email: "giuseppe.verdi@email.com", 
        foto: "", 
        ATT: 75, 
        DIF: 85, 
        VEL: 70, 
        FOR: 80, 
        PAS: 90, 
        POR: 60 
      }
    ];
    
    console.log('Usando dati di fallback');
    
    const response = NextResponse.json(fallbackPlayers);
    
    // Aggiungi header CORS anche per i dati di fallback
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  }
} 