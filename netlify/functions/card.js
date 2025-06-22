const Airtable = require('airtable');

// Funzione per ottenere i dati del giocatore direttamente da Airtable
async function getPlayerByEmail(email, base) {
  try {
    console.log('Recupero dati giocatore per email:', email);
    
    const records = await base('players').select({
      filterByFormula: `{email} = '${email}'`
    }).all();
    
    if (records.length === 0) {
      console.log('Giocatore non trovato per email:', email);
      return null;
    }
    
    const record = records[0];
    
    // Gestisce il campo photoUrl come attachment di Airtable
    const photoAttachments = record.get('photoUrl');
    let fotoUrl = '';
    
    if (photoAttachments && Array.isArray(photoAttachments) && photoAttachments.length > 0) {
      fotoUrl = photoAttachments[0].url || '';
      console.log(`Foto trovata per email ${email}: ${fotoUrl}`);
    } else {
      console.log(`Nessuna foto per email ${email}`);
    }
    
    const playerData = {
      nome: record.get('name') || 'Giocatore Sconosciuto',
      email: record.get('email') || email,
      photoUrl: fotoUrl,
      ATT: Number(record.get('Attacco')) || 50,
      DEF: Number(record.get('Difesa')) || 50,
      VEL: Number(record.get('Velocità')) || 50,
      FOR: Number(record.get('Forza')) || 50,
      PAS: Number(record.get('Passaggio')) || 50,
      POR: Number(record.get('Portiere')) || 50
    };
    
    console.log('Dati giocatore trovati:', playerData);
    return playerData;
  } catch (error) {
    console.error('Errore nel recupero dati giocatore:', error);
    return null;
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

  // Solo GET è supportato per questa API
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // Estrai l'email dal path
    const pathSegments = event.path.split('/');
    const emailEncoded = pathSegments[pathSegments.length - 1];
    
    if (!emailEncoded) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email mancante nel path' })
      };
    }

    const email = decodeURIComponent(emailEncoded);
    console.log('EMAIL estratta:', email);

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
    
    // Recupera dati da Airtable
    const playerData = await getPlayerByEmail(email, base);
    console.log('Dati giocatore recuperati:', playerData);
    
    if (!playerData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: `Giocatore con email ${email} non trovato` 
        })
      };
    }

    const stats = [playerData.ATT, playerData.DEF, playerData.VEL, playerData.FOR, playerData.PAS, playerData.POR];
    
    // Calcola overall come media delle 5 migliori statistiche
    const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
    const overall = Math.round(top5Stats.reduce((a, b) => a + b, 0) / 5);

    const template = overall >= 90 ? 'ultimate' : overall >= 78 ? 'oro' : overall >= 65 ? 'argento' : 'bronzo';
    console.log(`Overall: ${overall}, Template: ${template}`);

    // Invece di generare l'immagine, restituiamo i dati per la generazione lato client
    const cardData = {
      player: playerData,
      stats: {
        ATT: Math.round(playerData.ATT),
        VEL: Math.round(playerData.VEL),
        PAS: Math.round(playerData.PAS),
        FOR: Math.round(playerData.FOR),
        DIF: Math.round(playerData.DEF),
        POR: Math.round(playerData.POR)
      },
      overall: overall,
      template: template,
      hasPhoto: !!(playerData.photoUrl && playerData.photoUrl.trim() !== ''),
      // URLs per il frontend
      cardTemplateUrl: `/cards/${template}.png`,
      photoUrl: playerData.photoUrl || null
    };

    console.log('Card data preparata:', cardData);

    // TEMPORANEO: Redirect alle card template statiche invece di generare immagini
    const templateUrl = `https://calcettinho.netlify.app/cards/${template}.png`;
    
    return {
      statusCode: 302,
      headers: {
        'Location': templateUrl,
        'Cache-Control': 'public, max-age=300'
      },
      body: ''
    };

  } catch (error) {
    console.error('Errore nella generazione card:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Errore nella generazione card',
        details: error.message || 'Errore sconosciuto'
      })
    };
  }
}; 