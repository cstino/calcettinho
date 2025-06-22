const Airtable = require('airtable');

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
    // URL: /api/player-stats/email@example.com
    // Path: /player-stats/email@example.com
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
    console.log(`Recupero statistiche per giocatore: ${email}`);

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
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            gol: 0,
            partiteDisputate: 0,
            partiteVinte: 0,
            partitePareggiate: 0,
            partitePerse: 0,
            assistenze: 0,
            cartelliniGialli: 0,
            cartelliniRossi: 0
          })
        };
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
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(stats)
      };
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
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(stats)
    };
    
  } catch (error) {
    console.error('Errore nel recupero statistiche giocatore:', error);
    
    // Fallback con statistiche vuote in caso di errore
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        gol: 0,
        partiteDisputate: 0,
        partiteVinte: 0,
        partitePareggiate: 0,
        partitePerse: 0,
        assistenze: 0,
        cartelliniGialli: 0,
        cartelliniRossi: 0
      })
    };
  }
}; 