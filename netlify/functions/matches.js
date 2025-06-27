const Airtable = require('airtable');

// Funzione helper per aggiornare le statistiche dei giocatori
async function updatePlayerStats(base, matchRecord, playerStats, scoreA, scoreB) {
  const playerStatsTable = base('player_stats');
  
  // Ottieni i team dalla partita
  const teamA = Array.isArray(matchRecord.get('teamA')) 
    ? matchRecord.get('teamA')
    : JSON.parse(matchRecord.get('teamA') || '[]');
  const teamB = Array.isArray(matchRecord.get('teamB')) 
    ? matchRecord.get('teamB')
    : JSON.parse(matchRecord.get('teamB') || '[]');
  
  // Determina chi ha vinto
  const teamAWon = scoreA > scoreB;
  const teamBWon = scoreB > scoreA;
  const isDraw = scoreA === scoreB;
  
  console.log(`Risultato: Team A ${scoreA} - ${scoreB} Team B`);
  console.log(`Vincitore: ${teamAWon ? 'Team A' : teamBWon ? 'Team B' : 'Pareggio'}`);
  
  // Aggiorna statistiche per tutti i giocatori
  const allPlayers = [...teamA, ...teamB];
  
  for (const playerEmail of allPlayers) {
    try {
      console.log(`Aggiornamento statistiche per: ${playerEmail}`);
      
      // Trova il giocatore nella tabella player_stats
      const playerRecords = await playerStatsTable.select({
        filterByFormula: `{playerEmail} = '${playerEmail}'`
      }).all();
      
      const playerMatchStats = playerStats[playerEmail] || {};
      const isInTeamA = teamA.includes(playerEmail);
      
      // Determina risultato per questo giocatore
      let isWin = false;
      let isLoss = false;
      if (!isDraw) {
        if ((isInTeamA && teamAWon) || (!isInTeamA && teamBWon)) {
          isWin = true;
        } else {
          isLoss = true;
        }
      }
      
      if (playerRecords.length === 0) {
        // Crea nuovo record se non esiste
        const newStats = {
          playerEmail: playerEmail,
          Gol: playerMatchStats.gol || 0,
          partiteDisputate: 1,
          partiteVinte: isWin ? 1 : 0,
          partitePareggiate: isDraw ? 1 : 0,
          partitePerse: isLoss ? 1 : 0,
          assistenze: playerMatchStats.assist || 0,
          cartelliniGialli: playerMatchStats.gialli || 0,
          cartelliniRossi: playerMatchStats.rossi || 0
        };
        
        console.log(`Creazione nuovo record per ${playerEmail}:`, newStats);
        await playerStatsTable.create(newStats);
        
      } else {
        // Aggiorna record esistente
        const playerRecord = playerRecords[0];
        const currentStats = playerRecord.fields;
        
        const updateData = {
          Gol: (Number(currentStats.Gol) || 0) + (playerMatchStats.gol || 0),
          partiteDisputate: (Number(currentStats.partiteDisputate) || 0) + 1,
          partiteVinte: (Number(currentStats.partiteVinte) || 0) + (isWin ? 1 : 0),
          partitePareggiate: (Number(currentStats.partitePareggiate) || 0) + (isDraw ? 1 : 0),
          partitePerse: (Number(currentStats.partitePerse) || 0) + (isLoss ? 1 : 0),
          assistenze: (Number(currentStats.assistenze) || 0) + (playerMatchStats.assist || 0),
          cartelliniGialli: (Number(currentStats.cartelliniGialli) || 0) + (playerMatchStats.gialli || 0),
          cartelliniRossi: (Number(currentStats.cartelliniRossi) || 0) + (playerMatchStats.rossi || 0)
        };
        
        console.log(`Aggiornamento dati per ${playerEmail}:`, updateData);
        await playerStatsTable.update(playerRecord.id, updateData);
      }
      console.log(`Statistiche aggiornate per: ${playerEmail}`);
      
    } catch (playerError) {
      console.error(`Errore aggiornamento ${playerEmail}:`, playerError);
      // Continua con gli altri giocatori
    }
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

  try {
    // Configurazione Airtable
    const airtable = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    });

    const base = airtable.base(process.env.AIRTABLE_BASE_ID);
    const matchesTable = base('matches');

    // POST - Gestisce endpoint specifici come /start
    if (event.httpMethod === 'POST') {
      const pathSegments = event.path.split('/');
      
      // Controlla se è una richiesta di start: /api/matches/{matchId}/start
      if (pathSegments.includes('start')) {
        const matchIdIndex = pathSegments.indexOf('matches') + 1;
        const matchId = pathSegments[matchIdIndex];
        
        console.log('=== AVVIO PARTITA NETLIFY ===', matchId);
        
        if (!matchId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID partita mancante' })
          };
        }
        
        // Trova il record in Airtable
        const records = await matchesTable.select({
          filterByFormula: `{IDmatch} = '${matchId}'`
        }).all();

        if (records.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Partita non trovata' })
          };
        }

        const record = records[0];
        
        // Verifica che la partita sia in stato scheduled o undefined (per retrocompatibilità)
        const currentStatus = record.get('match_status');
        const isCompleted = record.get('completed');
        
        // Se la partita è già completata, non può essere avviata
        if (isCompleted === true) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Impossibile avviare la partita. La partita è già completata.' })
          };
        }
        
        // Se lo status è già in_progress, non può essere riavviata
        if (currentStatus === 'in_progress') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'La partita è già in corso.' })
          };
        }
        
        // Permetti l'avvio se lo status è 'scheduled' o undefined (retrocompatibilità)
        if (currentStatus && currentStatus !== 'scheduled') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Impossibile avviare la partita. Status attuale: ${currentStatus}` })
          };
        }

        // Aggiorna lo status a in_progress
        const updatedRecord = await matchesTable.update(record.id, {
          match_status: 'in_progress'
        });

        console.log('Partita avviata con successo');

        // Parse player stats se disponibili
        let playerStats = {};
        try {
          if (updatedRecord.get('playerStats')) {
            playerStats = JSON.parse(updatedRecord.get('playerStats'));
          }
        } catch (e) {
          console.log('Errore nel parsing playerStats:', e);
          playerStats = {};
        }

        // Restituisci i dati aggiornati
        const updatedMatch = {
          id: updatedRecord.id,
          matchId: updatedRecord.get('IDmatch'),
          date: updatedRecord.get('date'),
          teamA: Array.isArray(updatedRecord.get('teamA')) 
            ? updatedRecord.get('teamA')
            : (typeof updatedRecord.get('teamA') === 'string' && updatedRecord.get('teamA') 
              ? JSON.parse(updatedRecord.get('teamA')) 
              : []),
          teamB: Array.isArray(updatedRecord.get('teamB')) 
            ? updatedRecord.get('teamB')
            : (typeof updatedRecord.get('teamB') === 'string' && updatedRecord.get('teamB') 
              ? JSON.parse(updatedRecord.get('teamB')) 
              : []),
          scoreA: updatedRecord.get('scoreA') ? Number(updatedRecord.get('scoreA')) : 0,
          scoreB: updatedRecord.get('scoreB') ? Number(updatedRecord.get('scoreB')) : 0,
          teamAScorer: updatedRecord.get('teamAscorer') || '',
          teamBScorer: updatedRecord.get('teamBscorer') || '',
          assistA: updatedRecord.get('AssistA') || '',
          assistB: updatedRecord.get('AssistB') || '',
          playerStats: playerStats,
          completed: updatedRecord.get('completed') === true,
          location: updatedRecord.get('location') || 'Campo Centrale',
          referee: updatedRecord.get('referee') || '',
          match_status: updatedRecord.get('match_status'),
          status: updatedRecord.get('match_status')
        };

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Partita avviata con successo',
            match: updatedMatch
          })
        };
      }
      
      // POST normale - Crea una nuova partita
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

    // GET - Recupera tutte le partite o una specifica
    if (event.httpMethod === 'GET') {
      // Controlla se c'è un matchId nell'URL
      const pathSegments = event.path.split('/');
      const matchId = pathSegments[pathSegments.length - 1];
      
      // Se c'è un matchId specifico, recupera solo quella partita
      if (matchId && matchId !== 'matches') {
        console.log('=== RECUPERO PARTITA SINGOLA ===', matchId);
        
        const records = await matchesTable.select({
          filterByFormula: `{IDmatch} = '${matchId}'`
        }).all();
        
        if (records.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Partita non trovata' })
          };
        }
        
        const record = records[0];
        
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
        
        const match = {
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
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(match)
        };
      }
      
      // Altrimenti recupera tutte le partite
      console.log('=== RECUPERO TUTTE LE PARTITE ===');
      
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



    // PUT - Aggiorna partita (finalizzazione)
    if (event.httpMethod === 'PUT') {
      console.log('=== AGGIORNAMENTO PARTITA ===');
      
      // Estrai matchId dall'URL (come per DELETE)
      const pathSegments = event.path.split('/');
      const matchId = pathSegments[pathSegments.length - 1];
      
      console.log('MatchId dall\'URL:', matchId);
      
      const body = JSON.parse(event.body);
      console.log('Body ricevuto:', body);
      
      const { scoreA, scoreB, playerStats, completed, match_status } = body;

      // Validazione dati
      if (!matchId || matchId === 'matches') {
        console.log('Validazione fallita: matchId mancante o non valido');
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
        if (match_status !== undefined) updateData.match_status = match_status;
        
        // Salva playerStats come stringa JSON se forniti
        if (playerStats) {
          updateData.playerStats = JSON.stringify(playerStats);
        }

        console.log('Dati da aggiornare:', updateData);

        // Aggiorna il record
        const updatedRecord = await matchesTable.update(record.id, updateData);
        console.log('Record aggiornato con successo:', updatedRecord.id);

        // Se la partita è stata completata, aggiorna le statistiche dei giocatori
        if (completed && playerStats) {
          console.log('=== AGGIORNAMENTO STATISTICHE GIOCATORI ===');
          try {
            await updatePlayerStats(base, updatedRecord, playerStats, scoreA, scoreB);
            console.log('Statistiche giocatori aggiornate con successo');
          } catch (statsError) {
            console.error('Errore nell\'aggiornamento statistiche:', statsError);
            // Non blocchiamo la risposta per errori nelle statistiche
          }
        }

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

    // DELETE - Elimina partita
    if (event.httpMethod === 'DELETE') {
      console.log('=== ELIMINAZIONE PARTITA ===');
      
      // Estrai matchId dall'URL
      const pathSegments = event.path.split('/');
      const matchId = pathSegments[pathSegments.length - 1];
      
      console.log('MatchId da eliminare:', matchId);

      if (!matchId) {
        console.log('Validazione fallita: matchId mancante');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'matchId è obbligatorio' })
        };
      }

      try {
        // Trova la partita da eliminare
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
        console.log('Record da eliminare:', record.id);

        // Elimina il record
        await matchesTable.destroy(record.id);
        console.log('Record eliminato con successo');

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Partita eliminata con successo'
          })
        };

      } catch (deleteError) {
        console.error('Errore nell\'eliminazione:', deleteError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: `Errore nell'eliminazione della partita: ${deleteError.message}` 
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