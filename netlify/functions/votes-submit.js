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

  // Solo POST è supportato per questa API
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    console.log('=== INIZIO SUBMISSION VOTI ===');
    
    const { voterEmail, matchId, votes } = JSON.parse(event.body);
    console.log('Dati ricevuti:', { voterEmail, matchId, votesCount: votes?.length });
    
    if (!voterEmail || !matchId || !votes || !Array.isArray(votes) || votes.length === 0) {
      console.log('Validazione fallita: dati mancanti');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Dati di votazione mancanti o non validi (voterEmail, matchId, votes richiesti)' 
        })
      };
    }

    // Configurazione Airtable
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      throw new Error('Missing Airtable configuration in environment variables');
    }

    const base = Airtable.base(baseId);

    // ✅ CONTROLLO VOTI DUPLICATI - Verifica se l'utente ha già votato
    console.log('🔍 Controllo voti esistenti per:', { voterEmail, matchId });
    
    try {
      const existingVotes = await base('votes')
        .select({
          filterByFormula: `AND(
            {fromPlayerId} = '${voterEmail}',
            {matchId} = '${matchId}'
          )`,
          maxRecords: 1
        })
        .firstPage();

      if (existingVotes.length > 0) {
        console.log('❌ Voti già esistenti trovati:', existingVotes.length);
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Hai già votato per questa partita!',
            code: 'ALREADY_VOTED'
          })
        };
      }
      
      console.log('✅ Nessun voto esistente trovato, procedo con l\'inserimento');
    } catch (checkError) {
      console.error('❌ Errore nel controllo voti esistenti:', checkError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Errore nel controllo voti esistenti'
        })
      };
    }

    // ✅ Validazione voti
    const invalidVotes = votes.filter(vote => 
      !['UP', 'DOWN', 'NEUTRAL'].includes(vote.voteType) ||
      typeof vote.motmVote !== 'boolean'
    );
    if (invalidVotes.length > 0) {
      console.log('Validazione fallita: voti non validi', invalidVotes);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Voti non validi: ogni voto deve essere UP, DOWN o NEUTRAL con motmVote boolean' 
        })
      };
    }

    // Validazione: deve esserci almeno 1 voto
    if (votes.length < 1) {
      console.log('Validazione fallita: nessun voto');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Deve esserci almeno 1 voto' 
        })
      };
    }

    console.log('✅ Validazione passata. Ricevuta richiesta di votazione:', { 
      voterEmail, 
      matchId, 
      votesCount: votes.length,
      motmVotes: votes.filter(v => v.motmVote).length
    });

    // ✅ Prepara i record per Airtable
    const voteRecords = votes.map(vote => ({
      fields: {
        matchId: matchId,
        fromPlayerId: voterEmail, // Email del votante
        toPlayerId: vote.playerEmail, // Email del giocatore votato
        voteType: vote.voteType, // 'UP', 'DOWN' o 'NEUTRAL'
        motm_vote: vote.motmVote // true/false per il voto MOTM
      }
    }));

    console.log('✅ Records preparati per Airtable:', voteRecords.length, 'records');
    console.log('Primo record di esempio:', voteRecords[0]);
    console.log('MOTM votes trovati:', voteRecords.filter(r => r.fields.motm_vote).length);

    // Test credenziali Airtable
    console.log('🔑 Controllo credenziali Airtable...');
    console.log('API Key presente:', !!apiKey);
    console.log('Base ID presente:', !!baseId);

    // Inserisce i voti nella tabella "votes" di Airtable
    console.log('📤 Tentativo inserimento in Airtable...');
    const createdRecords = await base('votes').create(voteRecords);
    
    console.log('✅ Voti salvati con successo:', createdRecords.length);

    // ✅ Statistiche dettagliate per il log
    const stats = {
      total: createdRecords.length,
      upVotes: votes.filter(v => v.voteType === 'UP').length,
      downVotes: votes.filter(v => v.voteType === 'DOWN').length,
      neutralVotes: votes.filter(v => v.voteType === 'NEUTRAL').length,
      motmVotes: votes.filter(v => v.motmVote).length
    };

    console.log('📊 Statistiche voti salvati:', stats);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: `${createdRecords.length} voti salvati con successo per la partita ${matchId}`,
        votesSubmitted: createdRecords.length,
        matchId: matchId,
        stats: stats
      })
    };

  } catch (error) {
    console.error('Errore generale nella submission dei voti:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: `Errore nella submission dei voti: ${error.message || 'Errore sconosciuto'}` 
      })
    };
  }
}; 