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
    const startedAt = Date.now();
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
    console.log('🔍 Controllo ruolo per:', email, 'reqId=', event.requestId || 'n/a');

    // Configurazione Airtable
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      throw new Error('Credenziali Airtable mancanti');
    }

    Airtable.configure({
      endpointUrl: 'https://api.airtable.com',
      apiKey: apiKey
    });

    const base = Airtable.base(baseId);

    // Cerca l'utente nella tabella whitelist con timeout manuale di 9s (senza argomenti a firstPage)
    const withTimeout = (promise, ms) => Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Airtable timeout')), ms))
    ]);

    let records;
    try {
      const queryPromise = base('whitelist')
        .select({ filterByFormula: `{email} = "${email}"` })
        .firstPage();
      records = await withTimeout(queryPromise, 9000);
    } catch (e) {
      console.error('⏰ Timeout o errore Airtable:', e && e.message ? e.message : e);
      throw new Error('Timeout contattando Airtable');
    }

    if (records.length === 0) {
      console.log('❌ Utente non trovato in whitelist:', email);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Utente non autorizzato',
          role: null,
          isAdmin: false,
          isReferee: false,
          hasMatchManagementPrivileges: false
        })
      };
    }

    const userRecord = records[0];
    const roleField = userRecord.fields.Role;
    const role = typeof roleField === 'string' ? roleField : 'user'; // Default a 'user' se non specificato
    const isAdmin = role.toLowerCase() === 'admin';
    const isReferee = role.toLowerCase() === 'arbitro';
    const hasMatchManagementPrivileges = isAdmin || isReferee; // Admin e arbitro hanno privilegi di gestione partite

    console.log('✅ Ruolo trovato:', { email, role, isAdmin, isReferee, hasMatchManagementPrivileges, durationMs: Date.now() - startedAt });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        email,
        role,
        isAdmin,
        isReferee,
        hasMatchManagementPrivileges,
        message: `Utente ${email} ha ruolo: ${role}`
      })
    };

  } catch (error) {
    console.error('❌ Errore nel controllo ruolo:', error && error.message ? error.message : error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Errore interno del server',
        details: error.message || 'Errore sconosciuto',
        role: null,
        isAdmin: false,
        isReferee: false,
        hasMatchManagementPrivileges: false
      })
    };
  }
}; 