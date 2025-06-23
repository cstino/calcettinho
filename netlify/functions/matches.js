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
    const airtable = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    });

    const base = airtable.base(process.env.AIRTABLE_BASE_ID);
    const matchesTable = base('matches');

    // GET - Recupera tutte le partite
    if (event.httpMethod === 'GET') {
      console.log('=== RECUPERO PARTITE ===');
      
      const records = await matchesTable.select({
        sort: [{ field: 'date', direction: 'desc' }]
      }).all();
      console.log(`Record trovati: ${records.length}`);

      const matches = records.map((record) => {
        console.log(`Record ID: ${record.id}`);
        console.log('Campi del record:', record.fields);
        
        // Parse player stats se disponibili
        let playerStats = {};
        try {
          if (record.get('playerStats')) {
            playerStats = JSON.parse(record.get('playerStats'));
          }
        } catch (e) {
          console.log('Errore nel parsing playerStats:', e);
          playerStats = {};
        }

        return {
          id: record.id,
          matchId: record.get('IDmatch') || record.id,
          date: record.get('date') || '',
          teamA: Array.isArray(record.get('teamA')) 
            ? record.get('teamA')
            : (typeof record.get('teamA') === 'string' && record.get('teamA') 
              ? JSON.parse(record.get('teamA')) 
              : []),
          teamB: Array.isArray(record.get('teamB')) 
            ? record.get('teamB')
            : (typeof record.get('teamB') === 'string' && record.get('teamB') 
              ? JSON.parse(record.get('teamB')) 
              : []),
          scoreA: record.get('scoreA') ? Number(record.get('scoreA')) : undefined,
          scoreB: record.get('scoreB') ? Number(record.get('scoreB')) : undefined,
          teamAScorer: record.get('teamAscorer') || record.get('teamAScorer') || '',
          teamBScorer: record.get('teamBscorer') || record.get('teamBScorer') || '',
          assistA: record.get('AssistA') || '',
          assistB: record.get('AssistB') || '',
          completed: record.get('completed') === true || record.get('completed') === 'true',
          referee: record.get('referee') || '',
          match_status: record.get('match_status') || 'scheduled',
          playerStats: playerStats,
          status: record.get('match_status') || (record.get('completed') === true || record.get('completed') === 'true' 
            ? 'completed' 
            : 'scheduled')
        };
      });
      
      console.log('Partite processate e ordinate:', matches.length);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(matches)
      };
    }

    // POST - Crea una nuova partita
    if (event.httpMethod === 'POST') {
      console.log('=== CREAZIONE PARTITA ===');
      const body = JSON.parse(event.body);
      console.log('Body ricevuto:', body);
      
      const { date, teamA, teamB, referee } = body;

      // Validazione dati
      if (!date || !teamA || !teamB) {
        console.log('Validazione fallita: dati mancanti');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Dati mancanti: data, teamA e teamB sono obbligatori' })
        };
      }

      if (!Array.isArray(teamA) || !Array.isArray(teamB)) {
        console.log('Validazione fallita: team non sono array');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'teamA e teamB devono essere array di email' })
        };
      }

      if (teamA.length === 0 || teamB.length === 0) {
        console.log('Validazione fallita: squadre vuote');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Ogni squadra deve avere almeno un giocatore' })
        };
      }

      // Genera un ID unico per la partita
      const matchId = `match_${Date.now()}`;
      console.log('ID partita generato:', matchId);

      // Verifica credenziali Airtable
      console.log('API Key presente:', !!process.env.AIRTABLE_API_KEY);
      console.log('Base ID presente:', !!process.env.AIRTABLE_BASE_ID);

      // Crea il record in Airtable
      console.log('Tentativo di creazione record in Airtable...');
      const record = await matchesTable.create({
        IDmatch: matchId,
        date: date,
        teamA: JSON.stringify(teamA),
        teamB: JSON.stringify(teamB),
        completed: false,
        match_status: 'scheduled',
        referee: referee || ''
      });
      console.log('Record creato con successo in Airtable:', record.id);

      const newMatch = {
        id: record.id,
        matchId: matchId,
        date: date,
        teamA: teamA,
        teamB: teamB,
        completed: false,
        match_status: 'scheduled',
        referee: referee || ''
      };

      console.log('Partita creata:', newMatch);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          match: newMatch
        })
      };
    }

    // PUT - Aggiorna partita (finalizzazione)
    if (event.httpMethod === 'PUT') {
      console.log('=== AGGIORNAMENTO PARTITA ===');
      const body = JSON.parse(event.body);
      console.log('Body ricevuto:', body);
      
      const { matchId, scoreA, scoreB, playerStats, completed } = body;

      // Validazione dati
      if (!matchId) {
        console.log('Validazione fallita: matchId mancante');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'matchId è obbligatorio' })
        };
      }

      try {
        // Trova la partita da aggiornare
        console.log('Ricerca partita con matchId:', matchId);
        const records = await matchesTable.select({
          filterByFormula: `{IDmatch} = '${matchId}'`
        }).all();

        if (records.length === 0) {
          console.log('Partita non trovata');
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Partita non trovata' })
          };
        }

        const record = records[0];
        console.log('Record trovato:', record.id);

        // Prepara i dati da aggiornare
        const updateData = {};
        
        if (scoreA !== undefined) updateData.scoreA = scoreA;
        if (scoreB !== undefined) updateData.scoreB = scoreB;
        if (completed !== undefined) updateData.completed = completed;
        if (completed) updateData.match_status = 'completed';
        
        // Salva playerStats come stringa JSON se forniti
        if (playerStats) {
          updateData.playerStats = JSON.stringify(playerStats);
        }

        console.log('Dati da aggiornare:', updateData);

        // Aggiorna il record
        const updatedRecord = await matchesTable.update(record.id, updateData);
        console.log('Record aggiornato con successo:', updatedRecord.id);

        // Prepara la risposta con i dati aggiornati
        const updatedMatch = {
          id: updatedRecord.id,
          matchId: updatedRecord.get('IDmatch'),
          date: updatedRecord.get('date'),
          teamA: Array.isArray(updatedRecord.get('teamA')) 
            ? updatedRecord.get('teamA')
            : JSON.parse(updatedRecord.get('teamA') || '[]'),
          teamB: Array.isArray(updatedRecord.get('teamB')) 
            ? updatedRecord.get('teamB')
            : JSON.parse(updatedRecord.get('teamB') || '[]'),
          scoreA: updatedRecord.get('scoreA'),
          scoreB: updatedRecord.get('scoreB'),
          completed: updatedRecord.get('completed'),
          match_status: updatedRecord.get('match_status'),
          referee: updatedRecord.get('referee'),
          playerStats: updatedRecord.get('playerStats') 
            ? JSON.parse(updatedRecord.get('playerStats'))
            : {}
        };

        console.log('Partita aggiornata:', updatedMatch);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            match: updatedMatch
          })
        };

      } catch (updateError) {
        console.error('Errore nell\'aggiornamento:', updateError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: `Errore nell'aggiornamento della partita: ${updateError.message}` 
          })
        };
      }
    }

    // Metodo non supportato
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non supportato' })
    };

  } catch (error) {
    console.error('Errore nelle partite:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: `Errore nelle partite: ${error.message || 'Errore sconosciuto'}` 
      })
    };
  }
}; 