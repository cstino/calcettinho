// 🎯 FASE 3.2: DATABASE OPTIMIZATIONS - Delta Sync API
// Endpoint per delta sync con timestamp tracking e versioning

import { NextRequest, NextResponse } from 'next/server';
import { TimestampManager, TRACKED_ENTITIES, TrackedEntity } from '../../../utils/timestampManager';
import { DataVersionManager, ConflictResolutionStrategy } from '../../../utils/dataVersionManager';
import { EnhancedAirtable } from '../../../utils/enhancedAirtable';

// 📊 Interfaccia per richiesta delta sync
interface DeltaSyncRequest {
  entityType: TrackedEntity;
  lastSyncTime: string;
  limit?: number;
  clientVersion?: number;
  includeDeleted?: boolean;
}

// 📊 Interfaccia per richiesta batch sync
interface BatchSyncRequest {
  operations: Array<{
    action: 'create' | 'update' | 'delete';
    entityType: TrackedEntity;
    primaryKey?: string;
    data?: any;
    clientVersion?: number;
    clientTimestamp?: string;
  }>;
  conflictStrategy?: ConflictResolutionStrategy;
  modifiedBy?: string;
}

// 🔄 GET: Delta Sync - Recupera cambiamenti da ultima sincronizzazione
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') as TrackedEntity;
    const lastSyncTime = searchParams.get('lastSyncTime');
    const limit = parseInt(searchParams.get('limit') || '100');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    console.log(`🔄 [DeltaSync] GET request for ${entityType} since ${lastSyncTime}`);

    // Validazione parametri
    if (!entityType) {
      return NextResponse.json(
        { error: 'entityType parameter is required' },
        { status: 400 }
      );
    }

    if (!Object.values(TRACKED_ENTITIES).includes(entityType)) {
      return NextResponse.json(
        { error: `Invalid entityType: ${entityType}` },
        { status: 400 }
      );
    }

    if (!lastSyncTime) {
      return NextResponse.json(
        { error: 'lastSyncTime parameter is required' },
        { status: 400 }
      );
    }

    // Verifica formato timestamp
    const syncTime = new Date(lastSyncTime);
    if (isNaN(syncTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid lastSyncTime format. Use ISO 8601.' },
        { status: 400 }
      );
    }

    // Esegue delta sync
    const deltaResult = await TimestampManager.getEntitiesSince(
      entityType,
      lastSyncTime,
      limit
    );

    // Filtra elementi eliminati se richiesto
    let changes = deltaResult.changes;
    if (!includeDeleted) {
      changes = changes.filter(change => !change.data.deleted);
    }

    // Statistiche aggiuntive
    const syncStats = await TimestampManager.getSyncStats(entityType);

    const response = {
      success: true,
      data: {
        entityType,
        lastSyncTime,
        currentTime: TimestampManager.getCurrentTimestamp(),
        changes: changes.map(change => ({
          id: change.id,
          primaryKey: change.primaryKey,
          data: change.data,
          version: change.timestamps.version,
          updatedAt: change.timestamps.updatedAt,
          action: change.data.deleted ? 'deleted' : 'updated'
        })),
        hasMore: deltaResult.hasMore,
        nextCursor: deltaResult.nextCursor,
        statistics: {
          totalChanges: changes.length,
          deletedItems: deltaResult.changes.filter(c => c.data.deleted).length,
          syncStatus: syncStats
        }
      }
    };

    console.log(`✅ [DeltaSync] Retrieved ${changes.length} changes for ${entityType}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [DeltaSync] Error in GET:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during delta sync',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 📤 POST: Batch Sync - Applica cambiamenti con versioning
export async function POST(request: NextRequest) {
  try {
    const body: BatchSyncRequest = await request.json();
    const { 
      operations, 
      conflictStrategy = ConflictResolutionStrategy.LATEST_TIMESTAMP,
      modifiedBy
    } = body;

    console.log(`📤 [DeltaSync] POST request with ${operations.length} operations`);

    // Validazione
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        { error: 'operations array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (operations.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 operations per batch' },
        { status: 400 }
      );
    }

    // Validazione singole operazioni
    for (const [index, op] of operations.entries()) {
      if (!op.action || !op.entityType) {
        return NextResponse.json(
          { error: `Operation ${index}: action and entityType are required` },
          { status: 400 }
        );
      }

      if (!Object.values(TRACKED_ENTITIES).includes(op.entityType)) {
        return NextResponse.json(
          { error: `Operation ${index}: Invalid entityType: ${op.entityType}` },
          { status: 400 }
        );
      }

      if ((op.action === 'update' || op.action === 'delete') && !op.primaryKey) {
        return NextResponse.json(
          { error: `Operation ${index}: primaryKey is required for ${op.action}` },
          { status: 400 }
        );
      }

      if ((op.action === 'create' || op.action === 'update') && !op.data) {
        return NextResponse.json(
          { error: `Operation ${index}: data is required for ${op.action}` },
          { status: 400 }
        );
      }
    }

    // Esegue batch operation con enhanced utilities
    const batchResult = await EnhancedAirtable.batchOperation(
      operations,
      {
        enableVersioning: true,
        enableTimestamps: true,
        conflictStrategy,
        modifiedBy
      }
    );

    // Prepara response dettagliata
    const response = {
      success: true,
      data: {
        timestamp: TimestampManager.getCurrentTimestamp(),
        summary: batchResult.summary,
        totalProcessed: batchResult.totalProcessed,
        results: {
          successful: batchResult.successful.map(result => ({
            recordId: result.recordId,
            action: result.action,
            version: result.version,
            timestamp: result.timestamp
          })),
          failed: batchResult.failed.map(result => ({
            recordId: result.recordId,
            action: result.action,
            error: result.error
          })),
          conflicts: batchResult.conflicts.map(conflict => ({
            entityType: conflict.entityType,
            primaryKey: conflict.primaryKey,
            serverVersion: conflict.serverVersion,
            clientVersion: conflict.clientVersion,
            suggestedResolution: conflict.suggestedResolution,
            serverTimestamp: conflict.serverTimestamp,
            clientTimestamp: conflict.clientTimestamp
          }))
        }
      }
    };

    console.log(`✅ [DeltaSync] Batch sync completed:`, batchResult.summary);

    // Status code basato sui risultati
    const statusCode = batchResult.conflicts.length > 0 ? 409 : 200;

    return NextResponse.json(response, { status: statusCode });

  } catch (error) {
    console.error('❌ [DeltaSync] Error in POST:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during batch sync',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 📊 PUT: Statistics - Ottieni statistiche di sync
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') as TrackedEntity;

    console.log(`📊 [DeltaSync] Statistics request for ${entityType || 'all entities'}`);

    if (entityType) {
      // Statistiche per singola entità
      if (!Object.values(TRACKED_ENTITIES).includes(entityType)) {
        return NextResponse.json(
          { error: `Invalid entityType: ${entityType}` },
          { status: 400 }
        );
      }

      const stats = await EnhancedAirtable.getSyncStatistics(entityType);

      return NextResponse.json({
        success: true,
        data: {
          entityType,
          timestamp: TimestampManager.getCurrentTimestamp(),
          ...stats
        }
      });

    } else {
      // Statistiche per tutte le entità
      const allStats: Record<string, any> = {};

      for (const entity of Object.values(TRACKED_ENTITIES)) {
        try {
          allStats[entity] = await EnhancedAirtable.getSyncStatistics(entity);
        } catch (error) {
          console.warn(`⚠️ Could not get stats for ${entity}:`, error);
          allStats[entity] = { error: 'Failed to retrieve stats' };
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          timestamp: TimestampManager.getCurrentTimestamp(),
          entities: allStats,
          summary: {
            totalEntities: Object.keys(allStats).length,
            healthyEntities: Object.values(allStats).filter(s => !s.error).length
          }
        }
      });
    }

  } catch (error) {
    console.error('❌ [DeltaSync] Error in PUT:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during statistics retrieval',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 🔧 PATCH: Initialize - Inizializza metadata per entità esistenti
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') as TrackedEntity;
    const force = searchParams.get('force') === 'true';

    console.log(`🔧 [DeltaSync] Initialize metadata for ${entityType || 'all entities'}`);

    // Controllo autorizzazioni (in implementazione reale)
    // Questa operazione dovrebbe essere limitata agli admin
    
    if (entityType) {
      // Inizializza singola entità
      if (!Object.values(TRACKED_ENTITIES).includes(entityType)) {
        return NextResponse.json(
          { error: `Invalid entityType: ${entityType}` },
          { status: 400 }
        );
      }

      const result = await EnhancedAirtable.initializeEnhancedMetadata(entityType);

      return NextResponse.json({
        success: true,
        data: {
          entityType,
          timestamp: TimestampManager.getCurrentTimestamp(),
          result
        }
      });

    } else {
      // Inizializza tutte le entità
      const results: Record<string, any> = {};

      for (const entity of Object.values(TRACKED_ENTITIES)) {
        try {
          results[entity] = await EnhancedAirtable.initializeEnhancedMetadata(entity);
          
          // Pausa tra entità per evitare rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`❌ Error initializing ${entity}:`, error);
          results[entity] = { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      }

      const totalProcessed = Object.values(results)
        .filter(r => !r.error)
        .reduce((sum: number, r: any) => sum + r.processed, 0);

      return NextResponse.json({
        success: true,
        data: {
          timestamp: TimestampManager.getCurrentTimestamp(),
          entities: results,
          summary: {
            totalEntities: Object.keys(results).length,
            successfulEntities: Object.values(results).filter(r => !r.error).length,
            totalRecordsProcessed: totalProcessed
          }
        }
      });
    }

  } catch (error) {
    console.error('❌ [DeltaSync] Error in PATCH:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during initialization',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 