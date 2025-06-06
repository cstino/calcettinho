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
  photoUrl: string;
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
      photoUrl: record.get('photoUrl') as string,
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
      photoUrl: record.get('photoUrl') as string,
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

// Funzione per testare l'accesso alle tabelle
export async function testTableAccess() {
  try {
    console.log('=== TEST ACCESSO TABELLE AIRTABLE ===');
    
    // Test tabella players
    try {
      const playersRecords = await base('players').select().firstPage();
      console.log('✅ Tabella "players": accessibile,', playersRecords.length, 'record trovati');
    } catch (error) {
      console.log('❌ Tabella "players": errore -', error);
    }
    
    // Test tabella whitelist
    try {
      const whitelistRecords = await base('whitelist').select().firstPage();
      console.log('✅ Tabella "whitelist": accessibile,', whitelistRecords.length, 'record trovati');
    } catch (error) {
      console.log('❌ Tabella "whitelist": errore -', error);
    }
    
    // Test tabella special_cards
    try {
      const specialCardsRecords = await base('special_cards').select().firstPage();
      console.log('✅ Tabella "special_cards": accessibile,', specialCardsRecords.length, 'record trovati');
      
      if (specialCardsRecords.length > 0) {
        console.log('Primi record special_cards:');
        specialCardsRecords.forEach((record, i) => {
          console.log(`Record ${i + 1}:`, {
            template_id: record.get('template_id'),
            name: record.get('name'),
            description: record.get('description'),
            color: record.get('color'),
            template_image: record.get('template_image') ? 'Presente' : 'Assente'
          });
        });
      }
    } catch (error) {
      console.log('❌ Tabella "special_cards": errore -', error);
    }
    
    console.log('=== FINE TEST ===');
  } catch (error) {
    console.error('Errore durante test delle tabelle:', error);
  }
}

// Funzione per ottenere i dati delle card special da Airtable
export async function getSpecialCardData(template: string) {
  try {
    console.log('Recupero dati card special per template:', template);
    
    // Accesso diretto ad Airtable per recuperare i dati della card special
    const records = await base('special_cards').select({
      filterByFormula: `{template_id} = '${template}'`
    }).all();
    
    if (records.length === 0) {
      console.log('Card special non trovata per template:', template);
      return null;
    }
    
    const record = records[0];
    
    // Gestisce il campo template_image come attachment di Airtable
    const templateAttachments = record.get('template_image') as any[];
    let templateUrl = '';
    
    if (templateAttachments && Array.isArray(templateAttachments) && templateAttachments.length > 0) {
      templateUrl = templateAttachments[0].url || '';
      console.log(`Template immagine trovata per ${template}: ${templateUrl}`);
    } else {
      console.log(`Nessuna template immagine per ${template}`);
    }
    
    const cardData = {
      name: record.get('name') as string || 'Card Special',
      description: record.get('description') as string || 'Descrizione non disponibile',
      color: record.get('color') as string || '#B45309',
      templateUrl: templateUrl,
    };
    
    console.log('Dati card special trovati:', cardData);
    return cardData;
  } catch (error) {
    console.error('Errore nel recupero dati card special:', error);
    return null;
  }
} 