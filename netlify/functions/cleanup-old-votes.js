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

  // Configurazione Airtable
  const airtable = new Airtable({
    apiKey: process.env.AIRTABLE_API_KEY,
  });

  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Credenziali Airtable mancanti nelle variabili d\'ambiente'
      })
    };
  }

  const base = Airtable.base(baseId);

  if (event.httpMethod === 'POST') {
    // Endpoint per pulizia voti vecchi
    try {
      const body = JSON.parse(event.body || '{}');
      const { matchIds, beforeDate, dryRun = true } = body;
      
      console.log('🗑️ ADMIN CLEANUP: Inizio pulizia voti vecchi');
      console.log('Parametri:', { matchIds, beforeDate, dryRun });
      
      let filterFormula = '';
      
      if (matchIds && Array.isArray(matchIds) && matchIds.length > 0) {
        // Pulisci voti per specifiche partite
        const matchConditions = matchIds.map(id => `{matchId} = "${id}"`).join(', ');
        filterFormula = `OR(${matchConditions})`;
        console.log(`🎯 Modalità: Partite specifiche (${matchIds.length} partite)`);
      } else if (beforeDate) {
        // Pulisci voti prima di una certa data
        filterFormula = `DATETIME_PARSE({Created}) < DATETIME_PARSE("${beforeDate}")`;
        console.log(`📅 Modalità: Prima del ${beforeDate}`);
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Specificare matchIds o beforeDate per la pulizia'
          })
        };
      }
      
      // Recupera i voti da cancellare
      const voteRecords = await base('votes').select({
        filterByFormula: filterFormula
      }).all();
      
      console.log(`📊 Trovati ${voteRecords.length} voti da eliminare`);
      
      if (voteRecords.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Nessun voto da eliminare',
            deletedCount: 0,
            dryRun
          })
        };
      }
      
      // Raggruppa per matchId per statistiche
      const votesByMatch = voteRecords.reduce((acc, record) => {
        const matchId = record.get('matchId');
        if (!acc[matchId]) {
          acc[matchId] = [];
        }
        acc[matchId].push(record);
        return acc;
      }, {});
      
      console.log('📈 Distribuzione voti per partita:');
      Object.entries(votesByMatch).forEach(([matchId, votes]) => {
        console.log(`  ${matchId}: ${votes.length} voti`);
      });
      
      if (dryRun) {
        console.log('🔍 DRY RUN: Simulazione completata, nessun voto cancellato');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Dry run completato - nessun voto cancellato',
            deletedCount: 0,
            wouldDeleteCount: voteRecords.length,
            matchBreakdown: Object.fromEntries(
              Object.entries(votesByMatch).map(([matchId, votes]) => [matchId, votes.length])
            ),
            dryRun: true
          })
        };
      }
      
      // Cancella i voti in batch (max 10 per volta per limitazioni Airtable)
      let deletedCount = 0;
      const batchSize = 10;
      
      for (let i = 0; i < voteRecords.length; i += batchSize) {
        const batch = voteRecords.slice(i, i + batchSize);
        const recordIds = batch.map(record => record.id);
        
        try {
          await base('votes').destroy(recordIds);
          deletedCount += recordIds.length;
          console.log(`🗑️ Cancellati ${recordIds.length} voti (batch ${Math.floor(i / batchSize) + 1})`);
        } catch (batchError) {
          console.error(`❌ Errore nel batch ${Math.floor(i / batchSize) + 1}:`, batchError);
          // Continua con il prossimo batch
        }
      }
      
      console.log(`✅ Pulizia completata: ${deletedCount}/${voteRecords.length} voti cancellati`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Pulizia completata: ${deletedCount} voti cancellati`,
          deletedCount,
          totalFound: voteRecords.length,
          matchBreakdown: Object.fromEntries(
            Object.entries(votesByMatch).map(([matchId, votes]) => [matchId, votes.length])
          ),
          dryRun: false
        })
      };
      
    } catch (error) {
      console.error('❌ Errore nella pulizia voti:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Errore nella pulizia voti',
          details: error.message || 'Errore sconosciuto'
        })
      };
    }
  }

  if (event.httpMethod === 'GET') {
    // Endpoint per statistiche voti
    try {
      console.log('📊 ADMIN INFO: Recupero statistiche voti');
      
      // Conta tutti i voti
      const allVotes = await base('votes').select({
        fields: ['matchId', 'Created']
      }).all();
      
      // Raggruppa per matchId
      const votesByMatch = allVotes.reduce((acc, record) => {
        const matchId = record.get('matchId');
        const created = record.get('Created');
        
        if (!acc[matchId]) {
          acc[matchId] = {
            count: 0,
            oldestDate: created,
            newestDate: created
          };
        }
        
        acc[matchId].count++;
        
        if (new Date(created) < new Date(acc[matchId].oldestDate)) {
          acc[matchId].oldestDate = created;
        }
        
        if (new Date(created) > new Date(acc[matchId].newestDate)) {
          acc[matchId].newestDate = created;
        }
        
        return acc;
      }, {});
      
      const totalVotes = allVotes.length;
      const totalMatches = Object.keys(votesByMatch).length;
      const avgVotesPerMatch = totalMatches > 0 ? (totalVotes / totalMatches) : 0;
      
      // Trova le partite con più voti
      const topMatches = Object.entries(votesByMatch)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 10)
        .map(([matchId, data]) => ({ matchId, ...data }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          summary: {
            totalVotes,
            totalMatches,
            avgVotesPerMatch: Math.round(avgVotesPerMatch * 10) / 10,
            isApproachingLimit: totalVotes > 800, // Avviso quando si avvicina al limite
            limitReached: totalVotes >= 1000
          },
          topMatches,
          allMatches: votesByMatch
        })
      };
      
    } catch (error) {
      console.error('❌ Errore nel recupero statistiche voti:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Errore nel recupero statistiche voti',
          details: error.message || 'Errore sconosciuto'
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
}; 