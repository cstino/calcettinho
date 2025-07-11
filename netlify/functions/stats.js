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
        
        // Calcola overall dalle migliori 5 statistiche
        const playerStats = [
          Number(player.get('Attacco')) || 0,
          Number(player.get('Difesa')) || 0,
          Number(player.get('Velocità')) || 0,
          Number(player.get('Forza')) || 0,
          Number(player.get('Passaggio')) || 0,
          Number(player.get('Portiere')) || 0
        ];
        
        // Ordina le statistiche in ordine decrescente e prendi le migliori 5
        const top5Stats = playerStats.sort((a, b) => b - a).slice(0, 5);
        const overall = Math.round(top5Stats.reduce((sum, val) => sum + val, 0) / 5);
        
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
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(playersWithStats)
    };
    
  } catch (error) {
    console.error('Errore nel recupero statistiche aggregate:', error);
    
    // Fallback con dati vuoti in caso di errore
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify([])
    };
  }
}; 