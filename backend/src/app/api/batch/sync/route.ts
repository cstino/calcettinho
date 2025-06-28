/**
 * 📦 BATCH SYNC ENDPOINT
 * Gestisce multiple azioni offline in una singola richiesta per ottimizzare la sincronizzazione
 */

import { NextRequest, NextResponse } from 'next/server';
import OfflineMiddleware, { BatchResult } from '../../../utils/offlineMiddleware';
import Airtable from 'airtable';

// Configurazione Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('Credenziali Airtable mancanti nelle variabili d\'ambiente');
}

const base = Airtable.base(baseId);

// CORS Preflight
export async function OPTIONS() {
  return OfflineMiddleware.handleCORSPreflight();
}

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 === BATCH SYNC REQUEST STARTED ===');
    
    // Parse offline headers
    const offlineHeaders = OfflineMiddleware.parseOfflineHeaders(req);
    console.log('📡 Offline headers:', offlineHeaders);

    // Parse request body
    const { actions } = await req.json();
    
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      console.log('❌ Invalid batch request: no actions provided');
      return NextResponse.json({
        success: false,
        error: 'Batch request deve contenere array di actions'
      }, { status: 400 });
    }

    console.log(`📦 Processing batch with ${actions.length} actions`);

    // Valida azioni
    const validActions = actions.filter(action => 
      action.id && action.type && action.data && action.timestamp
    );

    if (validActions.length === 0) {
      console.log('❌ No valid actions in batch');
      return NextResponse.json({
        success: false,
        error: 'Nessuna azione valida nel batch'
      }, { status: 400 });
    }

    console.log(`✅ ${validActions.length}/${actions.length} valid actions`);

    // Processa batch usando middleware
    const batchResults = await OfflineMiddleware.processBatchRequest(
      validActions,
      async (action) => {
        return await processIndividualAction(action);
      }
    );

    // Calcola statistiche
    const stats = {
      total: batchResults.length,
      successful: batchResults.filter(r => r.success).length,
      failed: batchResults.filter(r => !r.success).length,
      withConflicts: batchResults.filter(r => r.conflicts && r.conflicts.length > 0).length
    };

    console.log('📊 Batch processing completed:', stats);

    // Crea response con middleware
    return OfflineMiddleware.createOfflineResponse(
      {
        processed: stats.total,
        successful: stats.successful,
        failed: stats.failed,
        results: batchResults
      },
      offlineHeaders,
      { 
        batchResults,
        deltaSync: true
      }
    );

  } catch (error) {
    console.error('💥 Batch sync error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore interno del server durante batch sync',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * 🎯 Processa singola azione del batch
 */
async function processIndividualAction(action: any): Promise<any> {
  console.log(`🔄 Processing action: ${action.type} - ${action.id}`);
  
  switch (action.type) {
    case 'VOTE':
      return await processVoteAction(action);
    
    case 'PROFILE_UPDATE':
      return await processProfileUpdateAction(action);
    
    case 'MATCH_ACTION':
      return await processMatchAction(action);
    
    case 'USER_PREFERENCE':
      return await processUserPreferenceAction(action);
    
    default:
      throw new Error(`Tipo azione non supportato: ${action.type}`);
  }
}

/**
 * 🗳️ Processa azione di voto
 */
async function processVoteAction(action: any): Promise<any> {
  const { voterEmail, matchId, votes } = action.data;
  
  console.log(`🗳️ Processing vote action for match ${matchId} by ${voterEmail}`);

  // Verifica voti duplicati
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
    // Conflitto - voti già esistenti
    const existingVoteData = existingVotes[0].fields;
    
    // Detect conflicts usando middleware
    const conflicts = OfflineMiddleware.detectConflicts(
      action.data,
      existingVoteData,
      action.timestamp
    );

    if (conflicts.length > 0) {
      console.log(`⚠️ Vote conflicts detected for action ${action.id}:`, conflicts);
      
      // Risolvi conflitti
      const { resolved, needsUserChoice } = OfflineMiddleware.resolveConflicts(
        conflicts,
        action.data,
        existingVoteData,
        action.conflictResolution || 'MERGE'
      );

      if (needsUserChoice) {
        throw new Error(`Conflitto voti richiede intervento utente per match ${matchId}`);
      }

      // Aggiorna con dati risolti
      await base('votes').update(existingVotes[0].id, resolved);
      
      return {
        type: 'VOTE_UPDATED',
        matchId,
        voterEmail,
        conflicts,
        resolved: true
      };
    }
    
    // Voti identici - nessuna azione necessaria
    return {
      type: 'VOTE_DUPLICATE',
      matchId,
      voterEmail,
      message: 'Voti già presenti e identici'
    };
  }

  // Crea nuovi voti
  const voteRecords = votes.map((vote: any) => ({
    fields: {
      matchId: matchId,
      fromPlayerId: voterEmail,
      toPlayerId: vote.playerEmail,
      voteType: vote.voteType,
      motm_vote: vote.motmVote
    }
  }));

  const createdRecords = await base('votes').create(voteRecords);
  
  console.log(`✅ Created ${createdRecords.length} new votes for match ${matchId}`);

  return {
    type: 'VOTE_CREATED',
    matchId,
    voterEmail,
    votesCreated: createdRecords.length
  };
}

/**
 * 👤 Processa aggiornamento profilo
 */
async function processProfileUpdateAction(action: any): Promise<any> {
  const { email, updates } = action.data;
  
  console.log(`👤 Processing profile update for ${email}`);

  // Trova record giocatore esistente
  const playerRecords = await base('players')
    .select({
      filterByFormula: `{email} = '${email}'`,
      maxRecords: 1
    })
    .firstPage();

  if (playerRecords.length === 0) {
    throw new Error(`Giocatore con email ${email} non trovato`);
  }

  const existingPlayer = playerRecords[0];
  const existingData = existingPlayer.fields;

  // Detect conflicts
  const conflicts = OfflineMiddleware.detectConflicts(
    updates,
    existingData,
    action.timestamp
  );

  if (conflicts.length > 0) {
    console.log(`⚠️ Profile conflicts detected for ${email}:`, conflicts);
    
    const { resolved, needsUserChoice } = OfflineMiddleware.resolveConflicts(
      conflicts,
      updates,
      existingData,
      action.conflictResolution || 'MERGE'
    );

    if (needsUserChoice) {
      throw new Error(`Conflitto profilo richiede intervento utente per ${email}`);
    }

    // Aggiorna con dati risolti
    await base('players').update(existingPlayer.id, resolved);
    
    return {
      type: 'PROFILE_UPDATED_WITH_CONFLICTS',
      email,
      conflicts,
      resolved: true
    };
  }

  // Aggiornamento normale
  await base('players').update(existingPlayer.id, updates);
  
  return {
    type: 'PROFILE_UPDATED',
    email,
    fieldsUpdated: Object.keys(updates)
  };
}

/**
 * ⚽ Processa azione match
 */
async function processMatchAction(action: any): Promise<any> {
  const { matchId, actionType, data } = action.data;
  
  console.log(`⚽ Processing match action: ${actionType} for match ${matchId}`);

  switch (actionType) {
    case 'UPDATE_TEAMS':
      // Aggiorna composizione squadre
      const matchRecords = await base('matches')
        .select({
          filterByFormula: `{IDmatch} = "${matchId}"`,
          maxRecords: 1
        })
        .firstPage();

      if (matchRecords.length === 0) {
        throw new Error(`Match ${matchId} non trovato`);
      }

      await base('matches').update(matchRecords[0].id, {
        teamA: JSON.stringify(data.teamA),
        teamB: JSON.stringify(data.teamB)
      });

      return {
        type: 'MATCH_TEAMS_UPDATED',
        matchId,
        teamA: data.teamA.length,
        teamB: data.teamB.length
      };

    case 'UPDATE_SCORE':
      // Aggiorna punteggio
      const scoreRecords = await base('matches')
        .select({
          filterByFormula: `{IDmatch} = "${matchId}"`,
          maxRecords: 1
        })
        .firstPage();

      if (scoreRecords.length === 0) {
        throw new Error(`Match ${matchId} non trovato`);
      }

      await base('matches').update(scoreRecords[0].id, {
        scoreA: data.scoreA,
        scoreB: data.scoreB
      });

      return {
        type: 'MATCH_SCORE_UPDATED',
        matchId,
        score: `${data.scoreA}-${data.scoreB}`
      };

    default:
      throw new Error(`Match action type non supportato: ${actionType}`);
  }
}

/**
 * ⚙️ Processa preferenze utente
 */
async function processUserPreferenceAction(action: any): Promise<any> {
  const { email, preferences } = action.data;
  
  console.log(`⚙️ Processing user preferences for ${email}`);

  // Per ora logga le preferenze - potresti implementare storage dedicato
  console.log('User preferences:', preferences);

  return {
    type: 'USER_PREFERENCES_SAVED',
    email,
    preferencesCount: Object.keys(preferences).length
  };
} 