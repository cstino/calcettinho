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
    console.log('🔍 Controllo ruolo per:', email);

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

    // Cerca l'utente nella tabella whitelist
    const records = await base('whitelist').select({
      filterByFormula: `{email} = "${email}"`
    }).firstPage();

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

    console.log('✅ Ruolo trovato:', { email, role, isAdmin, isReferee, hasMatchManagementPrivileges });

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
    console.error('❌ Errore nel controllo ruolo:', error);
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