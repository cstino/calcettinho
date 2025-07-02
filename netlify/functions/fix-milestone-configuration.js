const Airtable = require('airtable');

exports.handler = async (event, context) => {
  // Gestione CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (event.httpMethod !== 'POST') {
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

    console.log('🔧 FIX: Avvio correzione configurazione milestone...');

    const results = {
      milestonesCreated: 0,
      milestonesUpdated: 0,
      duplicatesRemoved: 0,
      issues: [],
      details: []
    };

    // 1. ✅ CONFIGURAZIONE CORRETTA MILESTONE
    const correctMilestoneConfig = [
      {
        template_id: 'goleador',
        name: 'Goleador',
        description: '10 gol segnati in carriera',
        condition_type: 'player_stats',
        condition_field: 'Gol',  // Nota: G maiuscola!
        condition_value: 10,
        ranking_behavior: 'threshold_met',
        is_active: true
      },
      {
        template_id: 'matador',
        name: 'Matador',
        description: '25 gol segnati in carriera',
        condition_type: 'player_stats',
        condition_field: 'Gol',
        condition_value: 25,
        ranking_behavior: 'threshold_met',
        is_active: true
      },
      {
        template_id: 'goldenboot',
        name: 'Golden Boot',
        description: '50 gol segnati in carriera',
        condition_type: 'player_stats',
        condition_field: 'Gol',
        condition_value: 50,
        ranking_behavior: 'threshold_met',
        is_active: true
      },
      {
        template_id: 'assistman',
        name: 'Assist Man',
        description: '10 assist forniti in carriera',
        condition_type: 'player_stats',
        condition_field: 'assistenze',  // Tutto minuscolo!
        condition_value: 10,
        ranking_behavior: 'threshold_met',
        is_active: true
      },
      {
        template_id: 'regista',
        name: 'Regista',
        description: '25 assist forniti in carriera',
        condition_type: 'player_stats',
        condition_field: 'assistenze',
        condition_value: 25,
        ranking_behavior: 'threshold_met',
        is_active: true
      },
      {
        template_id: 'elfutbol',
        name: 'El fútbol',
        description: '50 assist forniti in carriera',
        condition_type: 'player_stats',
        condition_field: 'assistenze',
        condition_value: 50,
        ranking_behavior: 'threshold_met',
        is_active: true
      },
      {
        template_id: 'win10',
        name: '10 Vittorie',
        description: '10 vittorie in carriera',
        condition_type: 'player_stats',
        condition_field: 'partiteVinte',
        condition_value: 10,
        ranking_behavior: 'threshold_met',
        is_active: true
      },
      {
        template_id: 'win25',
        name: '25 Vittorie',
        description: '25 vittorie in carriera',
        condition_type: 'player_stats',
        condition_field: 'partiteVinte',
        condition_value: 25,
        ranking_behavior: 'threshold_met',
        is_active: true
      },
      {
        template_id: 'win50',
        name: '50 Vittorie',
        description: '50 vittorie in carriera',
        condition_type: 'player_stats',
        condition_field: 'partiteVinte',
        condition_value: 50,
        ranking_behavior: 'threshold_met',
        is_active: true
      },
      {
        template_id: '1presenza',
        name: 'Prima Presenza',
        description: 'Prima partita giocata',
        condition_type: 'player_stats',
        condition_field: 'partiteDisputate',
        condition_value: 1,
        ranking_behavior: 'threshold_met',
        is_active: true
      }
    ];

    // 2. Controlla e aggiorna/crea le milestone nella tabella special_cards
    try {
      for (const milestoneConfig of correctMilestoneConfig) {
        // Cerca se esiste già
        const existingRecords = await base('special_cards').select({
          filterByFormula: `{template_id} = "${milestoneConfig.template_id}"`
        }).all();

        if (existingRecords.length > 0) {
          // Aggiorna record esistente
          const existingRecord = existingRecords[0];
          await base('special_cards').update(existingRecord.id, {
            name: milestoneConfig.name,
            description: milestoneConfig.description,
            condition_type: milestoneConfig.condition_type,
            condition_field: milestoneConfig.condition_field,
            condition_value: milestoneConfig.condition_value,
            ranking_behavior: milestoneConfig.ranking_behavior,
            is_active: milestoneConfig.is_active
          });
          
          results.milestonesUpdated++;
          results.details.push(`✅ Aggiornato: ${milestoneConfig.template_id}`);
          console.log(`✅ Milestone aggiornata: ${milestoneConfig.template_id}`);
        } else {
          // Crea nuovo record
          await base('special_cards').create({
            template_id: milestoneConfig.template_id,
            name: milestoneConfig.name,
            description: milestoneConfig.description,
            condition_type: milestoneConfig.condition_type,
            condition_field: milestoneConfig.condition_field,
            condition_value: milestoneConfig.condition_value,
            ranking_behavior: milestoneConfig.ranking_behavior,
            is_active: milestoneConfig.is_active
          });
          
          results.milestonesCreated++;
          results.details.push(`🆕 Creato: ${milestoneConfig.template_id}`);
          console.log(`🆕 Milestone creata: ${milestoneConfig.template_id}`);
        }
      }
    } catch (error) {
      results.issues.push(`❌ Errore nella configurazione milestone: ${error.message}`);
    }

    // 3. ✅ RIMUOVI DUPLICATI MOTM (se esistono)
    try {
      const motmRecords = await base('player_awards').select({
        filterByFormula: `{award_type} = "motm"`,
        sort: [{ field: 'Created time', direction: 'asc' }] // Ordina per data creazione
      }).all();

      // Raggruppa per player_email + match_id
      const groupedMotm = {};
      motmRecords.forEach(record => {
        const key = `${record.get('player_email')}_${record.get('match_id')}`;
        if (!groupedMotm[key]) {
          groupedMotm[key] = [];
        }
        groupedMotm[key].push(record);
      });

      // Rimuovi duplicati (mantieni solo il primo)
      for (const [key, records] of Object.entries(groupedMotm)) {
        if (records.length > 1) {
          // Rimuovi tutti tranne il primo
          const duplicatesToRemove = records.slice(1);
          
          for (const duplicateRecord of duplicatesToRemove) {
            await base('player_awards').destroy(duplicateRecord.id);
            results.duplicatesRemoved++;
            console.log(`🗑️ Rimosso duplicato MOTM: ${duplicateRecord.get('player_email')} - ${duplicateRecord.get('match_id')}`);
          }
          
          results.details.push(`🗑️ Rimossi ${duplicatesToRemove.length} duplicati MOTM per ${key}`);
        }
      }
    } catch (error) {
      results.issues.push(`❌ Errore nella rimozione duplicati MOTM: ${error.message}`);
    }

    // 4. ✅ ESEGUI CONTROLLO RETROATTIVO MILESTONE
    console.log('🔄 Eseguendo controllo retroattivo milestone...');
    try {
      const response = await fetch(`${event.headers.origin || 'https://calcettinho.netlify.app'}/.netlify/functions/retroactive-milestone-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const retroactiveResult = await response.json();
        results.details.push(`🔍 Controllo retroattivo: ${retroactiveResult.milestonesAssigned} milestone assegnate`);
        console.log(`🔍 Controllo retroattivo completato: ${retroactiveResult.milestonesAssigned} milestone`);
      } else {
        results.issues.push('⚠️ Controllo retroattivo fallito - eseguilo manualmente');
      }
    } catch (error) {
      results.issues.push(`⚠️ Errore nel controllo retroattivo: ${error.message}`);
    }

    // Riassunto
    if (results.issues.length === 0) {
      results.details.push('✅ Tutti i fix applicati con successo!');
    }

    console.log(`🏁 Fix completato: ${results.milestonesCreated} create, ${results.milestonesUpdated} aggiornate, ${results.duplicatesRemoved} duplicati rimossi`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Configurazione milestone corretta applicata',
        results: results,
        nextSteps: [
          'Le milestone sono ora configurate correttamente',
          'I duplicati MOTM sono stati rimossi',
          'È stato eseguito un controllo retroattivo delle milestone',
          'Testa il sistema con una nuova partita per verificare che funzioni'
        ]
      })
    };

  } catch (error) {
    console.error('❌ Errore nel fix configurazione milestone:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Errore nel fix configurazione milestone',
        details: error.message || 'Errore sconosciuto'
      })
    };
  }
}; 