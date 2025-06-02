import Airtable from 'airtable';

// Configurazione Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey) {
  throw new Error('AIRTABLE_API_KEY non trovata nelle variabili d\'ambiente');
}

if (!baseId) {
  throw new Error('AIRTABLE_BASE_ID non trovata nelle variabili d\'ambiente');
}

// Inizializza Airtable
Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: apiKey
});

const base = Airtable.base(baseId);

// Interfacce TypeScript
export interface Player {
  nome: string;
  email: string;
  foto: string;
  ATT: number;
  DEF: number;
  VEL: number;
  FOR: number;
  PAS: number;
  POR: number;
}

// Funzione per ottenere tutti i giocatori
export async function getPlayers(): Promise<Player[]> {
  try {
    console.log('Tentativo di connessione ad Airtable...');
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MANCANTE');
    console.log('Base ID:', baseId);
    
    const records = await base('players').select().all();
    console.log('Record recuperati:', records.length);
    
    return records.map(record => ({
      nome: record.get('name') as string,
      email: record.get('email') as string,
      foto: record.get('photoUrl') as string,
      ATT: record.get('Attacco') as number || 0,
      DEF: record.get('Difesa') as number || 0,
      VEL: record.get('Velocità') as number || 0,
      FOR: record.get('Forza') as number || 0,
      PAS: record.get('Passaggio') as number || 0,
      POR: record.get('Portiere') as number || 0
    }));
  } catch (error) {
    console.error('Errore dettagliato nel recupero dei giocatori da Airtable:', error);
    if (error instanceof Error) {
      console.error('Messaggio:', error.message);
      console.error('Stack:', error.stack);
    }
    throw error;
  }
}

// Funzione per ottenere un singolo giocatore per email
export async function getPlayerByEmail(email: string): Promise<Player | null> {
  try {
    const records = await base('players').select({
      filterByFormula: `{email} = "${email}"`
    }).all();
    
    if (records.length === 0) {
      return null;
    }
    
    const record = records[0];
    return {
      nome: record.get('name') as string,
      email: record.get('email') as string,
      foto: record.get('photoUrl') as string,
      ATT: record.get('Attacco') as number || 0,
      DEF: record.get('Difesa') as number || 0,
      VEL: record.get('Velocità') as number || 0,
      FOR: record.get('Forza') as number || 0,
      PAS: record.get('Passaggio') as number || 0,
      POR: record.get('Portiere') as number || 0
    };
  } catch (error) {
    console.error('Errore nel recupero del giocatore da Airtable:', error);
    throw error;
  }
}

// Funzione per verificare whitelist
export async function isEmailWhitelisted(email: string): Promise<boolean> {
  try {
    const records = await base('whitelist').select({
      filterByFormula: `{email} = "${email}"`
    }).all();
    
    return records.length > 0;
  } catch (error) {
    console.error('Errore nel controllo whitelist:', error);
    return false;
  }
} 