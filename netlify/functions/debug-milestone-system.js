const Airtable = require('airtable');

exports.handler = async (event, context) => {
  // Gestione CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non supportato' })
    };
  }

  try {
    // Configurazione Airtable
    const baseId = process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_API_KEY;
    
    if (!baseId || !apiKey) {
      throw new Error('Configurazione Airtable mancante');
    }

    Airtable.configure({ apiKey });
    const base = Airtable.base(baseId);

    console.log('🔍 DEBUG: Avvio diagnostica sistema milestone...');

    const diagnostics = {
      specialCardsConfig: [],
      playerStatsExample: null,
      playerAwardsExample: [],
      fieldMapping: {},
      issues: []
    };

    // 1. Verifica configurazione tabella special_cards
    try {
      const specialCardsRecords = await base('special_cards').select().all();
      console.log(`Trovati ${specialCardsRecords.length} record nella tabella special_cards`);
      
      diagnostics.specialCardsConfig = specialCardsRecords.map(record => ({
        id: record.id,
        template_id: record.get('template_id'),
        name: record.get('name'),
        condition_type: record.get('condition_type'),
        condition_field: record.get('condition_field'),
        condition_value: record.get('condition_value'),
        ranking_behavior: record.get('ranking_behavior'),
        is_active: record.get('is_active')
      }));

      // Filtra solo le milestone attive
      const activeMilestones = specialCardsRecords.filter(record => 
        record.get('is_active') === true &&
        record.get('condition_type') === 'player_stats' &&
        record.get('ranking_behavior') === 'threshold_met'
      );

      console.log(`Milestone attive trovate: ${activeMilestones.length}`);
      
      if (activeMilestones.length === 0) {
        diagnostics.issues.push('❌ PROBLEMA CRITICO: Nessuna milestone attiva trovata nella tabella special_cards');
      }

    } catch (error) {
      diagnostics.issues.push(`❌ ERRORE nel leggere tabella special_cards: ${error.message}`);
    }

    // 2. Verifica struttura tabella player_stats (prendi un esempio)
    try {
      const playerStatsRecords = await base('player_stats').select({
        maxRecords: 1
      }).all();
      
      if (playerStatsRecords.length > 0) {
        const exampleRecord = playerStatsRecords[0];
        diagnostics.playerStatsExample = {
          id: exampleRecord.id,
          playerEmail: exampleRecord.get('playerEmail'),
          Gol: exampleRecord.get('Gol'),
          gol: exampleRecord.get('gol'),
          assistenze: exampleRecord.get('assistenze'),
          assists: exampleRecord.get('assists'),
          partiteVinte: exampleRecord.get('partiteVinte'),
          partiteDisputate: exampleRecord.get('partiteDisputate'),
          availableFields: Object.keys(exampleRecord.fields)
        };

        // Verifica mapping dei campi
        diagnostics.fieldMapping = {
          'Gol': exampleRecord.get('Gol') || 'CAMPO NON TROVATO',
          'gol': exampleRecord.get('gol') || 'CAMPO NON TROVATO',
          'assistenze': exampleRecord.get('assistenze') || 'CAMPO NON TROVATO',
          'assists': exampleRecord.get('assists') || 'CAMPO NON TROVATO',
          'partiteVinte': exampleRecord.get('partiteVinte') || 'CAMPO NON TROVATO',
          'partiteDisputate': exampleRecord.get('partiteDisputate') || 'CAMPO NON TROVATO'
        };

      } else {
        diagnostics.issues.push('❌ PROBLEMA: Nessun record trovato nella tabella player_stats');
      }
    } catch (error) {
      diagnostics.issues.push(`❌ ERRORE nel leggere tabella player_stats: ${error.message}`);
    }

    // 3. Verifica player_awards per duplicati MOTM
    try {
      const playerAwardsRecords = await base('player_awards').select({
        filterByFormula: `{award_type} = "motm"`,
        sort: [{ field: 'Created time', direction: 'desc' }],
        maxRecords: 10
      }).all();
      
      diagnostics.playerAwardsExample = playerAwardsRecords.map(record => ({
        id: record.id,
        player_email: record.get('player_email'),
        award_type: record.get('award_type'),
        match_id: record.get('match_id'),
        status: record.get('status'),
        createdTime: record.get('Created time')
      }));

      // Controlla duplicati
      const duplicates = {};
      playerAwardsRecords.forEach(record => {
        const key = `${record.get('player_email')}_${record.get('match_id')}`;
        if (duplicates[key]) {
          duplicates[key].push(record.id);
        } else {
          duplicates[key] = [record.id];
        }
      });

      const actualDuplicates = Object.entries(duplicates).filter(([key, ids]) => ids.length > 1);
      if (actualDuplicates.length > 0) {
        diagnostics.issues.push(`❌ DUPLICATI MOTM TROVATI: ${actualDuplicates.length} casi`);
        diagnostics.motmDuplicates = actualDuplicates;
      }

    } catch (error) {
      diagnostics.issues.push(`❌ ERRORE nel leggere tabella player_awards: ${error.message}`);
    }

    // 4. Test milestone simulation per un giocatore con statistiche note
    try {
      if (diagnostics.playerStatsExample && diagnostics.specialCardsConfig.length > 0) {
        const testEmail = diagnostics.playerStatsExample.playerEmail;
        console.log(`🧪 Test simulazione milestone per ${testEmail}`);
        
        diagnostics.milestoneSimulation = [];
        
        const activeMilestones = diagnostics.specialCardsConfig.filter(card => 
          card.is_active === true &&
          card.condition_type === 'player_stats' &&
          card.ranking_behavior === 'threshold_met'
        );

        for (const milestone of activeMilestones) {
          const fieldName = milestone.condition_field;
          const requiredValue = milestone.condition_value;
          const currentValue = diagnostics.playerStatsExample[fieldName];
          
          diagnostics.milestoneSimulation.push({
            template_id: milestone.template_id,
            condition_field: fieldName,
            required_value: requiredValue,
            current_value: currentValue,
            field_exists: currentValue !== undefined,
            would_trigger: currentValue >= requiredValue,
            notes: currentValue === undefined ? 'CAMPO NON TROVATO!' : 
                   currentValue >= requiredValue ? 'MILESTONE RAGGIUNTA' : 'Milestone non raggiunta'
          });
        }
      }
    } catch (error) {
      diagnostics.issues.push(`❌ ERRORE nella simulazione milestone: ${error.message}`);
    }

    // Riassunto problemi
    if (diagnostics.issues.length === 0) {
      diagnostics.issues.push('✅ Nessun problema critico rilevato nella configurazione');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Diagnostica sistema milestone completata',
        diagnostics: diagnostics,
        recommendations: [
          'Verifica che nella tabella special_cards ci siano record attivi con condition_type="player_stats"',
          'Controlla che i nomi dei campi in condition_field corrispondano esattamente ai campi in player_stats',
          'I campi corretti dovrebbero essere: "Gol", "assistenze", "partiteVinte", "partiteDisputate"',
          'Per MOTM, verifica che non ci siano processi che creano duplicati per la stessa partita'
        ]
      })
    };

  } catch (error) {
    console.error('❌ Errore nella diagnostica sistema milestone:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Errore nella diagnostica sistema milestone',
        details: error.message || 'Errore sconosciuto'
      })
    };
  }
}; 