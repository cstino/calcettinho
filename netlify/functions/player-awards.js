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

  try {
    // Configurazione Airtable
    const baseId = process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_API_KEY;

    if (!baseId || !apiKey) {
      throw new Error('Variabili di ambiente Airtable mancanti');
    }

    Airtable.configure({
      apiKey: apiKey,
    });

    const base = Airtable.base(baseId);

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

    const decodedEmail = decodeURIComponent(emailEncoded);

    // GET - Recupera i premi del giocatore
    if (event.httpMethod === 'GET') {
      console.log(`Recupero premi per giocatore: ${decodedEmail}`);
      
      // Cerca tutti i premi per l'email specificata
      const records = await base('player_awards').select({
        filterByFormula: `{player_email} = "${decodedEmail}"`
      }).all();
      
      console.log(`Trovati ${records.length} premi per ${decodedEmail}`);
      
      const awards = records.map((record) => ({
        id: record.id,
        awardType: record.get('award_type'),
        matchId: record.get('match_id'),
        status: record.get('status'), // 'pending' o 'unlocked'
        unlockedAt: record.get('unlocked_at'),
        selected: record.get('selected') === true, // Se è la card selezionata come retro
        createdAt: record.get('Created time')
      }));
      
      // Separa per status
      const pendingAwards = awards.filter(award => award.status === 'pending');
      const unlockedAwards = awards.filter(award => award.status === 'unlocked');
      const selectedAward = awards.find(award => award.selected);
      
      const result = {
        total: awards.length,
        pending: pendingAwards.length,
        unlocked: unlockedAwards.length,
        awards: awards,
        pendingAwards,
        unlockedAwards,
        selectedCard: selectedAward || null
      };
      
      console.log(`Premi per ${decodedEmail}:`, result);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    }

    // POST - Sblocca un premio (da pending a unlocked)
    if (event.httpMethod === 'POST') {
      const { awardId } = JSON.parse(event.body);
      
      console.log(`Sbloccando premio ${awardId} per giocatore ${decodedEmail}`);
      
      // Trova il record del premio
      const records = await base('player_awards').select({
        filterByFormula: `AND({player_email} = "${decodedEmail}", RECORD_ID() = "${awardId}")`
      }).all();
      
      if (records.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Premio non trovato'
          })
        };
      }
      
      const record = records[0];
      
      // Verifica che sia in stato pending
      if (record.get('status') !== 'pending') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Premio già sbloccato o in stato non valido'
          })
        };
      }
      
      // Aggiorna lo status a unlocked
      await base('player_awards').update(record.id, {
        status: 'unlocked',
        unlocked_at: new Date().toISOString()
      });
      
      console.log(`Premio ${awardId} sbloccato con successo per ${decodedEmail}`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Premio sbloccato con successo',
          awardId: awardId,
          awardType: record.get('award_type')
        })
      };
    }

    // PUT - Imposta la card selezionata come retro
    if (event.httpMethod === 'PUT') {
      const { awardId } = JSON.parse(event.body);
      
      console.log(`Impostando card selezionata ${awardId} per giocatore ${decodedEmail}`);
      
      // Prima rimuovi la selezione da tutte le altre card del giocatore
      const allRecords = await base('player_awards').select({
        filterByFormula: `{player_email} = "${decodedEmail}"`
      }).all();
      
      // Aggiorna tutti i record del giocatore per deselezionarli
      const updatePromises = allRecords.map(record => 
        base('player_awards').update(record.id, {
          selected: false
        })
      );
      
      await Promise.all(updatePromises);
      
      // Se awardId è null, significa deselezionare tutto (usa solo card base)
      if (awardId === null) {
        console.log(`Deselezionate tutte le card per ${decodedEmail}, verrà usata solo la card base`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Card base selezionata come retro'
          })
        };
      }
      
      // Trova il record specifico da selezionare
      const targetRecords = await base('player_awards').select({
        filterByFormula: `AND({player_email} = "${decodedEmail}", RECORD_ID() = "${awardId}")`
      }).all();
      
      if (targetRecords.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Premio non trovato'
          })
        };
      }
      
      const targetRecord = targetRecords[0];
      
      // Verifica che sia sbloccato
      if (targetRecord.get('status') !== 'unlocked') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Impossibile selezionare una card non sbloccata'
          })
        };
      }
      
      // Seleziona la card target
      await base('player_awards').update(targetRecord.id, {
        selected: true
      });
      
      console.log(`Card ${awardId} selezionata come retro per ${decodedEmail}`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Card ${targetRecord.get('award_type')} selezionata come retro`,
          awardType: targetRecord.get('award_type')
        })
      };
    }

    // Metodo non supportato
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non supportato' })
    };

  } catch (error) {
    console.error('Errore nei player awards:', error);
    
    // Fallback con collezione vuota in caso di errore (per GET)
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          total: 0,
          pending: 0,
          unlocked: 0,
          awards: [],
          pendingAwards: [],
          unlockedAwards: [],
          selectedCard: null
        })
      };
    }
    
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