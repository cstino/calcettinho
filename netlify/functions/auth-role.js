// Usa direttamente l'API REST di Airtable: lo SDK legacy può bloccarsi su runtime serverless

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

    // Chiama REST API Airtable con timeout (9s)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const filterFormula = encodeURIComponent(`{email} = "${email}"`);
    const url = `https://api.airtable.com/v0/${baseId}/whitelist?filterByFormula=${filterFormula}&maxRecords=1`;

    let res;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json'
        },
        signal: controller.signal
      });
    } catch (e) {
      console.error('⏰ Timeout o errore rete verso Airtable:', e && e.message ? e.message : e);
      throw new Error('Timeout contattando Airtable');
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('❌ Airtable non OK:', res.status, text);

      // Fallback: se rate limit 429, prova whitelist locale da env FALLBACK_WHITELIST_JSON
      if (res.status === 429 && process.env.FALLBACK_WHITELIST_JSON) {
        try {
          const cfg = JSON.parse(process.env.FALLBACK_WHITELIST_JSON);
          const inAdmins = Array.isArray(cfg.admins) && cfg.admins.map((e) => String(e).toLowerCase()).includes(email.toLowerCase());
          const inRefs = Array.isArray(cfg.referees) && cfg.referees.map((e) => String(e).toLowerCase()).includes(email.toLowerCase());
          const inUsers = Array.isArray(cfg.users) && cfg.users.map((e) => String(e).toLowerCase()).includes(email.toLowerCase());

          if (inAdmins || inRefs || inUsers) {
            const role = inAdmins ? 'admin' : inRefs ? 'arbitro' : 'user';
            const isAdmin = inAdmins;
            const isReferee = inRefs;
            const hasMatchManagementPrivileges = isAdmin || isReferee;
            console.log('🟡 Fallback whitelist locale usata per', email);
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
                message: 'Risposta da fallback locale (rate limit Airtable)'
              })
            };
          }
        } catch (e) {
          console.error('Errore parsing FALLBACK_WHITELIST_JSON:', e && e.message ? e.message : e);
        }
      }

      // 401/403 → token o permessi; 404 → base/table; 422 → formula
      return {
        statusCode: res.status,
        headers,
        body: JSON.stringify({ success: false, error: 'Airtable error', status: res.status, body: text.slice(0, 500) })
      };
    }

    const json = await res.json();
    const records = Array.isArray(json.records) ? json.records : [];

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