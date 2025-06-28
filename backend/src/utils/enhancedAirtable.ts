// 🎯 FASE 3.2: DATABASE OPTIMIZATIONS - Enhanced Airtable Utilities
// Integra TimestampManager, DataVersionManager e optimistic updates

import Airtable from 'airtable';
import { 
  TimestampManager, 
  TrackedEntity, 
  TRACKED_ENTITIES, 
  SyncDelta,
  TimestampFields 
} from './timestampManager';
import { 
  DataVersionManager, 
  ConflictResolutionStrategy, 
  VersionResult, 
  ConflictData 
} from './dataVersionManager';

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('Missing Airtable configuration for EnhancedAirtable');
}

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: apiKey
});

const base = Airtable.base(baseId);

// 🔧 Opzioni per operazioni enhanced
export interface EnhancedOperationOptions {
  enableVersioning?: boolean;
  enableTimestamps?: boolean;
  conflictStrategy?: ConflictResolutionStrategy;
  modifiedBy?: string;
  skipCache?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

// 📊 Risultato di operazione enhanced
export interface EnhancedOperationResult {
  success: boolean;
  recordId: string;
  version?: number;
  action: 'created' | 'updated' | 'deleted' | 'conflict' | 'skipped';
  conflictData?: ConflictData;
  timestamp?: string;
  error?: string;
}

// 🔄 Batch operation result
export interface BatchOperationResult {
  successful: EnhancedOperationResult[];
  failed: EnhancedOperationResult[];
  conflicts: ConflictData[];
  totalProcessed: number;
  summary: {
    created: number;
    updated: number;
    deleted: number;
    conflicts: number;
    skipped: number;
  };
}

// 📱 EnhancedAirtable - Utilities potenziate per Airtable
export class EnhancedAirtable {

  // 🆕 Crea record con versioning e timestamp
  static async createRecord(
    entityType: TrackedEntity,
    data: any,
    options: EnhancedOperationOptions = {}
  ): Promise<EnhancedOperationResult> {
    try {
      const {
        enableVersioning = true,
        enableTimestamps = true,
        modifiedBy
      } = options;

      console.log(`🆕 [EnhancedAirtable] Creating ${entityType} record with enhanced features`);

      // Prepara dati con metadata
      const recordData = { ...data };
      
      if (enableTimestamps) {
        const timestamps = TimestampManager.getInitialTimestamps(modifiedBy);
        Object.assign(recordData, timestamps);
      }

      if (enableVersioning) {
        recordData.version = 1;
      }

      // Crea record
      const record = await base(entityType).create(recordData);
      
      console.log(`✅ [EnhancedAirtable] Created ${entityType}:${record.id} with enhanced metadata`);

      return {
        success: true,
        recordId: record.id,
        version: 1,
        action: 'created',
        timestamp: recordData.createdAt
      };

    } catch (error) {
      console.error(`❌ [EnhancedAirtable] Error creating ${entityType} record:`, error);
      return {
        success: false,
        recordId: '',
        action: 'conflict',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 🔄 Aggiorna record con versioning avanzato
  static async updateRecord(
    entityType: TrackedEntity,
    primaryKey: string,
    data: any,
    clientVersion?: number,
    clientTimestamp?: string,
    options: EnhancedOperationOptions = {}
  ): Promise<EnhancedOperationResult> {
    try {
      const {
        enableVersioning = true,
        conflictStrategy = ConflictResolutionStrategy.LATEST_TIMESTAMP,
        modifiedBy
      } = options;

      console.log(`🔄 [EnhancedAirtable] Updating ${entityType}:${primaryKey} with versioning`);

      if (enableVersioning && clientVersion && clientTimestamp) {
        // Usa DataVersionManager per update con conflict resolution
        const result = await DataVersionManager.applyVersionedUpdate(
          entityType,
          primaryKey,
          data,
          clientVersion,
          clientTimestamp,
          modifiedBy,
          conflictStrategy
        );

        return {
          success: result.success,
          recordId: result.recordId,
          version: result.version,
          action: result.action,
          conflictData: result.conflictData,
          error: result.error
        };

      } else {
        // Update semplice con timestamp
        const record = await this.findRecordByPrimaryKey(entityType, primaryKey);
        
        if (!record) {
          // Record non esiste, crealo
          return await this.createRecord(entityType, data, options);
        }

        const updateData = { ...data };
        
        if (options.enableTimestamps) {
          updateData.updatedAt = TimestampManager.getCurrentTimestamp();
          if (modifiedBy) {
            updateData.lastModifiedBy = modifiedBy;
          }
        }

        if (enableVersioning) {
          const currentVersion = record.get('version') as number || 1;
          updateData.version = currentVersion + 1;
        }

        await base(entityType).update(record.id, updateData);

        console.log(`✅ [EnhancedAirtable] Updated ${entityType}:${record.id}`);

        return {
          success: true,
          recordId: record.id,
          version: updateData.version,
          action: 'updated',
          timestamp: updateData.updatedAt
        };
      }

    } catch (error) {
      console.error(`❌ [EnhancedAirtable] Error updating ${entityType}:${primaryKey}:`, error);
      return {
        success: false,
        recordId: '',
        action: 'conflict',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 🗑️ Elimina record con soft delete
  static async deleteRecord(
    entityType: TrackedEntity,
    recordId: string,
    options: EnhancedOperationOptions = {}
  ): Promise<EnhancedOperationResult> {
    try {
      const { modifiedBy } = options;

      console.log(`🗑️ [EnhancedAirtable] Deleting ${entityType}:${recordId}`);

      // Controlla se supporta soft delete
      if (this.supportsSoftDelete(entityType)) {
        // Soft delete: marca come eliminato
        const updateData: any = {
          deleted: true,
          deletedAt: TimestampManager.getCurrentTimestamp(),
          updatedAt: TimestampManager.getCurrentTimestamp()
        };

        if (modifiedBy) {
          updateData.deletedBy = modifiedBy;
        }

        await base(entityType).update(recordId, updateData);
        
        console.log(`✅ [EnhancedAirtable] Soft deleted ${entityType}:${recordId}`);

        return {
          success: true,
          recordId,
          action: 'deleted',
          timestamp: updateData.deletedAt
        };

      } else {
        // Hard delete
        await base(entityType).destroy(recordId);
        
        console.log(`✅ [EnhancedAirtable] Hard deleted ${entityType}:${recordId}`);

        return {
          success: true,
          recordId,
          action: 'deleted'
        };
      }

    } catch (error) {
      console.error(`❌ [EnhancedAirtable] Error deleting ${entityType}:${recordId}:`, error);
      return {
        success: false,
        recordId,
        action: 'conflict',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 📦 Operazioni batch con versioning
  static async batchOperation(
    operations: Array<{
      action: 'create' | 'update' | 'delete';
      entityType: TrackedEntity;
      primaryKey?: string;
      recordId?: string;
      data?: any;
      clientVersion?: number;
      clientTimestamp?: string;
    }>,
    options: EnhancedOperationOptions = {}
  ): Promise<BatchOperationResult> {
    console.log(`📦 [EnhancedAirtable] Starting batch operation with ${operations.length} operations`);

    const successful: EnhancedOperationResult[] = [];
    const failed: EnhancedOperationResult[] = [];
    const conflicts: ConflictData[] = [];

    // Processa operazioni in batch per efficienza
    const batchSize = 10; // Limite Airtable
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (op) => {
        try {
          let result: EnhancedOperationResult;

          switch (op.action) {
            case 'create':
              result = await this.createRecord(op.entityType, op.data!, options);
              break;

            case 'update':
              result = await this.updateRecord(
                op.entityType,
                op.primaryKey!,
                op.data!,
                op.clientVersion,
                op.clientTimestamp,
                options
              );
              break;

            case 'delete':
              result = await this.deleteRecord(op.entityType, op.recordId!, options);
              break;

            default:
              throw new Error(`Unknown operation: ${op.action}`);
          }

          if (result.success) {
            successful.push(result);
          } else {
            failed.push(result);
          }

          if (result.conflictData) {
            conflicts.push(result.conflictData);
          }

        } catch (error) {
          failed.push({
            success: false,
            recordId: op.recordId || '',
            action: 'conflict',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      await Promise.all(batchPromises);
      
      // Pausa tra batch per rispettare rate limits
      if (i + batchSize < operations.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const summary = {
      created: successful.filter(r => r.action === 'created').length,
      updated: successful.filter(r => r.action === 'updated').length,
      deleted: successful.filter(r => r.action === 'deleted').length,
      conflicts: conflicts.length,
      skipped: successful.filter(r => r.action === 'skipped').length
    };

    console.log(`✅ [EnhancedAirtable] Batch operation completed:`, summary);

    return {
      successful,
      failed,
      conflicts,
      totalProcessed: operations.length,
      summary
    };
  }

  // 🔄 Delta sync per entità
  static async getDeltaSync(
    entityType: TrackedEntity,
    since: string,
    limit: number = 100
  ): Promise<SyncDelta> {
    return await TimestampManager.getEntitiesSince(entityType, since, limit);
  }

  // 🔍 Trova record per chiave primaria
  private static async findRecordByPrimaryKey(
    entityType: TrackedEntity,
    primaryKey: string
  ): Promise<any | null> {
    try {
      let filterFormula = '';
      
      switch (entityType) {
        case TRACKED_ENTITIES.PLAYERS:
        case TRACKED_ENTITIES.WHITELIST:
          filterFormula = `{email} = '${primaryKey}'`;
          break;
        case TRACKED_ENTITIES.MATCHES:
          filterFormula = `{IDmatch} = '${primaryKey}'`;
          break;
        case TRACKED_ENTITIES.PLAYER_STATS:
          filterFormula = `{playerEmail} = '${primaryKey}'`;
          break;
        default:
          const records = await base(entityType).select().all();
          return records.find(r => r.id === primaryKey) || null;
      }

      const records = await base(entityType).select({
        filterByFormula: filterFormula
      }).all();

      return records.length > 0 ? records[0] : null;

    } catch (error) {
      console.error(`❌ [EnhancedAirtable] Error finding record:`, error);
      return null;
    }
  }

  // 🗑️ Controlla se l'entità supporta soft delete
  private static supportsSoftDelete(entityType: TrackedEntity): boolean {
    // Entità che supportano soft delete (non eliminazione definitiva)
    const softDeleteEntities = [
      TRACKED_ENTITIES.PLAYERS,
      TRACKED_ENTITIES.MATCHES,
      TRACKED_ENTITIES.PLAYER_STATS
    ];
    
    return softDeleteEntities.includes(entityType);
  }

  // 📊 Statistiche di sync per entità
  static async getSyncStatistics(entityType: TrackedEntity): Promise<{
    timestamp: TimestampFields;
    versioning: any;
    cacheStatus: {
      lastSync?: string;
      pendingChanges: number;
      conflictsCount: number;
    };
  }> {
    try {
      console.log(`📊 [EnhancedAirtable] Getting sync statistics for ${entityType}`);

      // Statistiche timestamp
      const timestampStats = await TimestampManager.getSyncStats(entityType);
      
      // Statistiche versioning
      const versioningStats = await DataVersionManager.getVersioningStats(entityType);

      // Simula cache status (dovrebbe integrarsi con SmartCache)
      const cacheStatus = {
        lastSync: timestampStats.lastSync,
        pendingChanges: timestampStats.pending,
        conflictsCount: timestampStats.conflicts
      };

      return {
        timestamp: timestampStats as any,
        versioning: versioningStats,
        cacheStatus
      };

    } catch (error) {
      console.error(`❌ [EnhancedAirtable] Error getting sync statistics:`, error);
      throw error;
    }
  }

  // 🔧 Inizializza timestamp e versioning per tabelle esistenti
  static async initializeEnhancedMetadata(entityType: TrackedEntity): Promise<{
    processed: number;
    skipped: number;
    errors: number;
  }> {
    try {
      console.log(`🔧 [EnhancedAirtable] Initializing enhanced metadata for ${entityType}`);

      const records = await base(entityType).select().all();
      let processed = 0;
      let skipped = 0;
      let errors = 0;

      const batchSize = 10;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        const updates = batch.map(record => {
          const hasTimestamps = record.get('createdAt') && record.get('updatedAt');
          const hasVersion = record.get('version');

          if (hasTimestamps && hasVersion) {
            skipped++;
            return null;
          }

          const now = TimestampManager.getCurrentTimestamp();
          const updateFields: any = {};

          if (!hasTimestamps) {
            updateFields.createdAt = now;
            updateFields.updatedAt = now;
            updateFields.syncStatus = 'synced';
          }

          if (!hasVersion) {
            updateFields.version = 1;
          }

          return {
            id: record.id,
            fields: updateFields
          };
        }).filter(Boolean);

        if (updates.length > 0) {
          try {
            await base(entityType).update(updates);
            processed += updates.length;
          } catch (error) {
            console.error(`❌ Error updating batch:`, error);
            errors += updates.length;
          }
        }

        // Pausa tra batch
        if (i + batchSize < records.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`✅ [EnhancedAirtable] Metadata initialization completed: ${processed} processed, ${skipped} skipped, ${errors} errors`);

      return { processed, skipped, errors };

    } catch (error) {
      console.error(`❌ [EnhancedAirtable] Error initializing metadata:`, error);
      throw error;
    }
  }

  // 🧹 Pulizia dati obsoleti
  static async cleanupObsoleteData(
    entityType: TrackedEntity,
    olderThanDays: number = 30
  ): Promise<{ deleted: number; errors: number }> {
    try {
      console.log(`🧹 [EnhancedAirtable] Cleaning up ${entityType} data older than ${olderThanDays} days`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      const cutoffISO = cutoffDate.toISOString();

      // Formula per trovare record obsoleti soft-deleted
      const formula = `AND({deleted} = TRUE(), IS_BEFORE({deletedAt}, '${cutoffISO}'))`;
      
      const obsoleteRecords = await base(entityType).select({
        filterByFormula: formula
      }).all();

      let deleted = 0;
      let errors = 0;

      if (obsoleteRecords.length > 0) {
        const batchSize = 10;
        for (let i = 0; i < obsoleteRecords.length; i += batchSize) {
          const batch = obsoleteRecords.slice(i, i + batchSize);
          
          try {
            await base(entityType).destroy(batch.map(r => r.id));
            deleted += batch.length;
          } catch (error) {
            console.error(`❌ Error deleting batch:`, error);
            errors += batch.length;
          }

          // Pausa tra batch
          if (i + batchSize < obsoleteRecords.length) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }

      console.log(`✅ [EnhancedAirtable] Cleanup completed: ${deleted} deleted, ${errors} errors`);

      return { deleted, errors };

    } catch (error) {
      console.error(`❌ [EnhancedAirtable] Error during cleanup:`, error);
      throw error;
    }
  }
} 