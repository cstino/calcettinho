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

    console.log('🔍 CONTROLLO RETROATTIVO: Avvio controllo milestone per tutti i giocatori...');

    // Recupera tutte le condizioni milestone dalla tabella special_cards
    const specialCardsRecords = await base('special_cards').select({
      filterByFormula: `AND({is_active} = TRUE(), {condition_type} = "player_stats", {ranking_behavior} = "threshold_met")`
    }).all();
    
    console.log(`Trovate ${specialCardsRecords.length} milestone da controllare`);

    // Recupera tutti i giocatori con statistiche
    const allPlayerStatsRecords = await base('player_stats').select().all();
    console.log(`Trovati ${allPlayerStatsRecords.length} giocatori con statistiche`);

    let milestonesAssigned = 0;
    const assignedMilestones = [];

    // Per ogni giocatore, controlla tutte le milestone
    for (const playerStatsRecord of allPlayerStatsRecords) {
      const playerEmail = playerStatsRecord.get('playerEmail');
      console.log(`🔍 Controllo milestone per ${playerEmail}`);
      
      // Controlla ogni milestone
      for (const milestoneRecord of specialCardsRecords) {
        const templateId = milestoneRecord.get('template_id');
        const conditionField = milestoneRecord.get('condition_field');
        const conditionValue = Number(milestoneRecord.get('condition_value')) || 0;
        
        // Ottieni il valore attuale della statistica
        const currentValue = Number(playerStatsRecord.get(conditionField)) || 0;
        
        // Verifica se la milestone è raggiunta
        if (currentValue >= conditionValue) {
          console.log(`🎯 ${playerEmail}: ${conditionField} = ${currentValue} >= ${conditionValue} (${templateId})`);
          
          // Verifica se il giocatore ha già questa card
          const existingMilestone = await base('player_awards').select({
            filterByFormula: `AND({player_email} = "${playerEmail}", {award_type} = "${templateId}")`
          }).all();
          
          if (existingMilestone.length === 0) {
            // Milestone raggiunta ma non assegnata - assegnala retroattivamente
            await base('player_awards').create({
              player_email: playerEmail,
              award_type: templateId,
              match_id: 'retroactive-check',
              status: 'pending',
              unlocked_at: '',
              selected: false
            });
            
            assignedMilestones.push({
              playerEmail: playerEmail,
              awardType: templateId,
              currentValue: currentValue,
              requiredValue: conditionValue
            });
            
            milestonesAssigned++;
            console.log(`✅ Milestone ${templateId} assegnata retroattivamente a ${playerEmail} (${currentValue}/${conditionValue})`);
          } else {
            console.log(`⚠️ ${playerEmail} ha già la milestone ${templateId}`);
          }
        }
      }
    }

    console.log(`🏁 Controllo retroattivo completato: ${milestonesAssigned} milestone assegnate`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Controllo retroattivo milestone completato',
        milestonesAssigned: milestonesAssigned,
        playersChecked: allPlayerStatsRecords.length,
        milestoneTypesChecked: specialCardsRecords.length,
        assignedMilestones: assignedMilestones
      })
    };

  } catch (error) {
    console.error('❌ Errore nel controllo retroattivo milestone:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Errore nel controllo retroattivo milestone',
        details: error.message || 'Errore sconosciuto'
      })
    };
  }
}; 