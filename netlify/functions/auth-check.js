const Airtable = require('airtable');

// Funzione per verificare whitelist
async function isEmailWhitelisted(email, base) {
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

exports.handler = async (event, context) => {
  // Gestione CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Gestione preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Solo POST è supportato per questa API
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    const { email } = JSON.parse(event.body);
    
    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Email richiesta' 
        })
      };
    }

    // Normalizza l'email (lowercase e trim)
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('Verifica whitelist per email:', normalizedEmail);

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
    
    // Verifica se l'email è nella whitelist
    const isAllowed = await isEmailWhitelisted(normalizedEmail, base);
    
    console.log('Risultato whitelist:', isAllowed);
    
    if (isAllowed) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          allowed: true,
          message: 'Email autorizzata'
        })
      };
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          allowed: false,
          message: 'Email non autorizzata. Contatta un amministratore per richiedere l\'accesso.'
        })
      };
    }
    
  } catch (error) {
    console.error('Errore nella verifica whitelist:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Errore interno del server',
        details: error.message || 'Errore sconosciuto'
      })
    };
  }
}; 