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

exports.handler = async (event, context) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    // Estrai email dal path (formato: /.netlify/functions/player-photo/email@domain.com)
    const pathParts = event.path.split('/');
    let email = pathParts[pathParts.length - 1];
    
    if (!email || email === 'player-photo') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email parameter required' })
      };
    }

    // Decode email se necessario
    email = decodeURIComponent(email);
    
    console.log('Richiesta foto per email:', email);
    
    // Cerca il giocatore in Airtable
    const records = await base('players').select({
      filterByFormula: `{email} = '${email}'`
    }).all();
    
    if (records.length === 0) {
      console.log('Giocatore non trovato per email:', email);
      // Fallback alla foto statica se esiste
      const staticPhotoUrl = `https://calcettinho.netlify.app/players/${email}.jpg`;
      return {
        statusCode: 302,
        headers: {
          'Location': staticPhotoUrl,
          'Cache-Control': 'public, max-age=3600'
        },
        body: ''
      };
    }
    
    const record = records[0];
    
    // Gestisce il campo photoUrl come attachment di Airtable
    const photoAttachments = record.get('photoUrl');
    
    if (photoAttachments && Array.isArray(photoAttachments) && photoAttachments.length > 0) {
      const photoUrl = photoAttachments[0].url;
      console.log(`Foto trovata per ${email}: ${photoUrl}`);
      
      // Redirect alla foto di Airtable
      return {
        statusCode: 302,
        headers: {
          'Location': photoUrl,
          'Cache-Control': 'public, max-age=3600'
        },
        body: ''
      };
    }
    
    console.log(`Nessuna foto disponibile per ${email}, provo fallback statica`);
    
    // Fallback alla foto statica
    const staticPhotoUrl = `https://calcettinho.netlify.app/players/${email}.jpg`;
    return {
      statusCode: 302,
      headers: {
        'Location': staticPhotoUrl,
        'Cache-Control': 'public, max-age=300'
      },
      body: ''
    };
    
  } catch (error) {
    console.error('Errore nel recupero della foto:', error);
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