require('dotenv').config();
const Airtable = require('airtable');

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

// Funzione per ottenere un giocatore tramite email
async function getPlayerByEmail(email) {
  try {
    console.log('Recupero giocatore con email:', email);
    
    const records = await base('players').select({
      filterByFormula: `{email} = '${email}'`
    }).all();
    
    if (records.length === 0) {
      console.log('Giocatore non trovato per email:', email);
      return null;
    }
    
    const record = records[0];
    
    // Gestisce il campo foto come attachment di Airtable
    const photoAttachments = record.get('foto');
    let photoUrl = '';
    
    if (photoAttachments && Array.isArray(photoAttachments) && photoAttachments.length > 0) {
      photoUrl = photoAttachments[0].url || '';
    }
    
    const playerData = {
      nome: record.get('nome') || 'Giocatore',
      email: record.get('email') || email,
      ATT: Math.round(record.get('ATT') || 50),
      DEF: Math.round(record.get('DEF') || 50),
      VEL: Math.round(record.get('VEL') || 50),
      FOR: Math.round(record.get('FOR') || 50),
      PAS: Math.round(record.get('PAS') || 50),
      POR: Math.round(record.get('POR') || 50),
      photoUrl: photoUrl,
    };
    
    console.log('Giocatore trovato:', playerData);
    return playerData;
  } catch (error) {
    console.error('Errore nel recupero giocatore:', error);
    return null;
  }
}

// Funzione per ottenere i dati delle card special da Airtable
async function getSpecialCardData(template) {
  try {
    console.log('Recupero dati card special per template:', template);
    
    const records = await base('special_cards').select({
      filterByFormula: `{template_id} = '${template}'`
    }).all();
    
    if (records.length === 0) {
      console.log('Card special non trovata per template:', template);
      return null;
    }
    
    const record = records[0];
    
    // Gestisce il campo template_image come attachment di Airtable
    const templateAttachments = record.get('template_image');
    let templateUrl = '';
    
    if (templateAttachments && Array.isArray(templateAttachments) && templateAttachments.length > 0) {
      templateUrl = templateAttachments[0].url || '';
      console.log(`Template immagine trovata per ${template}: ${templateUrl}`);
    } else {
      console.log(`Nessuna template immagine per ${template}`);
    }
    
    const cardData = {
      name: record.get('name') || 'Card Special',
      description: record.get('description') || 'Descrizione non disponibile',
      color: record.get('color') || '#B45309',
      templateUrl: templateUrl,
    };
    
    console.log('Dati card special trovati:', cardData);
    return cardData;
  } catch (error) {
    console.error('Errore nel recupero dati card special:', error);
    return null;
  }
}

exports.handler = async (event, context) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Estrai email dal path (formato: /.netlify/functions/card-special/email@domain.com)
    const pathParts = event.path.split('/');
    let email = pathParts[pathParts.length - 1];
    
    if (!email || email === 'card-special') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email parameter required' })
      };
    }

    // Decode email se necessario
    email = decodeURIComponent(email);
    
    // Ottieni template dalla query string (default: '1presenza')
    const queryParams = event.queryStringParameters || {};
    const template = queryParams.template || '1presenza';
    
    console.log('EMAIL PARAM estratto:', email, 'Template:', template);
    
    // Recupera dati da Airtable
    const playerData = await getPlayerByEmail(email);
    const specialCardData = await getSpecialCardData(template);
    
    console.log('Dati giocatore recuperati:', playerData);
    console.log('Dati card special recuperati:', specialCardData);
    
    if (!playerData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: `Giocatore con email ${email} non trovato` 
        })
      };
    }

    if (!specialCardData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: `Card special con template ${template} non trovata` 
        })
      };
    }

    const stats = [playerData.ATT, playerData.DEF, playerData.VEL, playerData.FOR, playerData.PAS, playerData.POR];
    
    // Calcola overall come media delle 5 migliori statistiche
    const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
    const overall = Math.round(top5Stats.reduce((a, b) => a + b, 0) / 5);

    console.log(`Overall: ${overall}, Template special: ${template}`);

    // TEMPORANEO: Redirect alle card special statiche invece di generare immagini
    const specialTemplateUrl = `https://calcettinho.netlify.app/cards/special/${template}.png`;
    
    return {
      statusCode: 302,
      headers: {
        'Location': specialTemplateUrl,
        'Cache-Control': 'public, max-age=300'
      },
      body: ''
    };

  } catch (error) {
    console.error('Errore nella funzione card-special:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Errore interno del server',
        details: error.message
      })
    };
  }
}; 