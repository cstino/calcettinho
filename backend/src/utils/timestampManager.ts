// 🎯 FASE 3.2: DATABASE OPTIMIZATIONS - Timestamp Manager
// Gestisce timestamp-based sync e data versioning per Airtable

import Airtable from 'airtable';

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('Missing Airtable configuration for TimestampManager');
}

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: apiKey
});

const base = Airtable.base(baseId);

// 📊 Entità supportate per timestamp tracking
export const TRACKED_ENTITIES = {
  PLAYERS: 'players',
  VOTES: 'votes', 
  MATCHES: 'matches',
  PLAYER_STATS: 'player_stats',
  PLAYER_AWARDS: 'player_awards',
  WHITELIST: 'whitelist'
} as const;

export type TrackedEntity = typeof TRACKED_ENTITIES[keyof typeof TRACKED_ENTITIES];

// 🔄 Interfacce per timestamp tracking
export interface TimestampFields {
  createdAt: string;
  updatedAt: string;
  version: number;
  lastModifiedBy?: string;
  syncStatus?: 'synced' | 'pending' | 'conflict';
}

export interface EntityWithTimestamp {
  id: string;
  recordId: string;
  entityType: TrackedEntity;
  primaryKey: string; // email per players, matchId per votes, etc.
  data: any;
  timestamps: TimestampFields;
}

export interface SyncDelta {
  entityType: TrackedEntity;
  lastSyncTime: string;
  changes: EntityWithTimestamp[];
  hasMore: boolean;
  nextCursor?: string;
}

// 📱 TimestampManager - Sistema centralizzato per timestamp tracking
export class TimestampManager {
  
  // 🕐 Ottiene timestamp corrente ISO
  static getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  // 🔍 Recupera entità con timestamp dopo una data specifica (Delta Sync)
  static async getEntitiesSince(
    entityType: TrackedEntity,
    since: string,
    limit: number = 100
  ): Promise<SyncDelta> {
    try {
      console.log(`🔄 [TimestampManager] Delta sync for ${entityType} since ${since}`);

      // Formula Airtable per recuperare record modificati dopo 'since'
      const formula = `IS_AFTER({updatedAt}, '${since}')`;
      
      const records = await base(entityType).select({
        filterByFormula: formula,
        sort: [{ field: 'updatedAt', direction: 'asc' }],
        maxRecords: limit + 1 // +1 per verificare se ci sono più record
      }).all();

      const hasMore = records.length > limit;
      const actualRecords = hasMore ? records.slice(0, limit) : records;

      const changes: EntityWithTimestamp[] = actualRecords.map(record => ({
        id: record.id,
        recordId: record.id,
        entityType,
        primaryKey: this.extractPrimaryKey(record, entityType),
        data: this.extractEntityData(record, entityType),
        timestamps: this.extractTimestamps(record)
      }));

      const nextCursor = hasMore ? actualRecords[actualRecords.length - 1].get('updatedAt') as string : undefined;

      console.log(`✅ [TimestampManager] Found ${changes.length} changes for ${entityType}${hasMore ? ' (more available)' : ''}`);

      return {
        entityType,
        lastSyncTime: since,
        changes,
        hasMore,
        nextCursor
      };

    } catch (error) {
      console.error(`❌ [TimestampManager] Error in delta sync for ${entityType}:`, error);
      throw error;
    }
  }

  // 🆔 Estrae la chiave primaria in base al tipo di entità
  private static extractPrimaryKey(record: any, entityType: TrackedEntity): string {
    switch (entityType) {
      case TRACKED_ENTITIES.PLAYERS:
      case TRACKED_ENTITIES.WHITELIST:
        return record.get('email') as string || record.id;
      case TRACKED_ENTITIES.VOTES:
        return `${record.get('matchId')}_${record.get('fromPlayerId')}_${record.get('toPlayerId')}`;
      case TRACKED_ENTITIES.MATCHES:
        return record.get('IDmatch') as string || record.id;
      case TRACKED_ENTITIES.PLAYER_STATS:
        return record.get('playerEmail') as string || record.id;
      case TRACKED_ENTITIES.PLAYER_AWARDS:
        return `${record.get('player_email')}_${record.get('award_type')}_${record.get('match_id') || 'general'}`;
      default:
        return record.id;
    }
  }

  // 📄 Estrae i dati dell'entità escludendo i metadata di timestamp
  private static extractEntityData(record: any, entityType: TrackedEntity): any {
    const allFields = record.fields;
    const { createdAt, updatedAt, version, lastModifiedBy, syncStatus, ...entityData } = allFields;
    return entityData;
  }

  // ⏰ Estrae i timestamp dal record
  private static extractTimestamps(record: any): TimestampFields {
    return {
      createdAt: record.get('createdAt') as string || this.getCurrentTimestamp(),
      updatedAt: record.get('updatedAt') as string || this.getCurrentTimestamp(),
      version: record.get('version') as number || 1,
      lastModifiedBy: record.get('lastModifiedBy') as string,
      syncStatus: record.get('syncStatus') as 'synced' | 'pending' | 'conflict' || 'synced'
    };
  }

  // ✅ Aggiorna timestamp quando un record viene modificato
  static async touchRecord(
    entityType: TrackedEntity,
    recordId: string,
    modifiedBy?: string,
    incrementVersion: boolean = true
  ): Promise<void> {
    try {
      const now = this.getCurrentTimestamp();
      
      // Recupera versione corrente se necessario
      let currentVersion = 1;
      if (incrementVersion) {
        try {
          const record = await base(entityType).find(recordId);
          currentVersion = (record.get('version') as number || 0) + 1;
        } catch (error) {
          console.warn(`⚠️ Could not retrieve current version for ${recordId}, using 1`);
        }
      }

      const updateFields: any = {
        updatedAt: now,
        syncStatus: 'synced'
      };

      if (incrementVersion) {
        updateFields.version = currentVersion;
      }

      if (modifiedBy) {
        updateFields.lastModifiedBy = modifiedBy;
      }

      await base(entityType).update(recordId, updateFields);
      
      console.log(`✅ [TimestampManager] Updated timestamps for ${entityType}:${recordId} (v${currentVersion})`);

    } catch (error) {
      console.error(`❌ [TimestampManager] Error updating timestamps for ${entityType}:${recordId}:`, error);
      throw error;
    }
  }

  // 🆕 Inizializza timestamp per nuovo record
  static getInitialTimestamps(createdBy?: string): Partial<TimestampFields> {
    const now = this.getCurrentTimestamp();
    return {
      createdAt: now,
      updatedAt: now,
      version: 1,
      lastModifiedBy: createdBy,
      syncStatus: 'synced'
    };
  }

  // 🔍 Controlla se un record esiste ed è più recente
  static async isRecordNewer(
    entityType: TrackedEntity,
    recordId: string,
    clientTimestamp: string
  ): Promise<{ exists: boolean; isNewer: boolean; serverTimestamp?: string; version?: number }> {
    try {
      const record = await base(entityType).find(recordId);
      const serverTimestamp = record.get('updatedAt') as string;
      const version = record.get('version') as number || 1;

      const serverTime = new Date(serverTimestamp).getTime();
      const clientTime = new Date(clientTimestamp).getTime();

      return {
        exists: true,
        isNewer: serverTime > clientTime,
        serverTimestamp,
        version
      };

    } catch (error) {
      // Record non esiste
      return { exists: false, isNewer: false };
    }
  }

  // 🔄 Sistema di batch processing per timestamp updates
  static async batchTouchRecords(
    operations: Array<{
      entityType: TrackedEntity;
      recordId: string;
      modifiedBy?: string;
    }>
  ): Promise<void> {
    const now = this.getCurrentTimestamp();
    
    // Raggruppa per entityType per efficienza
    const groupedOps = operations.reduce((acc, op) => {
      if (!acc[op.entityType]) {
        acc[op.entityType] = [];
      }
      acc[op.entityType].push(op);
      return acc;
    }, {} as Record<TrackedEntity, typeof operations>);

    const promises = Object.entries(groupedOps).map(async ([entityType, ops]) => {
      const updates = ops.map(op => ({
        id: op.recordId,
        fields: {
          updatedAt: now,
          syncStatus: 'synced',
          ...(op.modifiedBy && { lastModifiedBy: op.modifiedBy })
        }
      }));

      // Airtable supporta massimo 10 update per batch
      const batches = [];
      for (let i = 0; i < updates.length; i += 10) {
        batches.push(updates.slice(i, i + 10));
      }

      for (const batch of batches) {
        await base(entityType as TrackedEntity).update(batch);
      }

      console.log(`✅ [TimestampManager] Batch updated ${updates.length} ${entityType} records`);
    });

    await Promise.all(promises);
  }

  // 📊 Statistiche di sync per monitoraggio
  static async getSyncStats(entityType: TrackedEntity): Promise<{
    total: number;
    synced: number;
    pending: number;
    conflicts: number;
    lastSync?: string;
  }> {
    try {
      const records = await base(entityType).select({
        fields: ['syncStatus', 'updatedAt']
      }).all();

      const stats = {
        total: records.length,
        synced: records.filter(r => r.get('syncStatus') === 'synced').length,
        pending: records.filter(r => r.get('syncStatus') === 'pending').length,
        conflicts: records.filter(r => r.get('syncStatus') === 'conflict').length,
        lastSync: records.length > 0 ? 
          records
            .map(r => r.get('updatedAt') as string)
            .sort()
            .reverse()[0] : undefined
      };

      console.log(`📊 [TimestampManager] Sync stats for ${entityType}:`, stats);
      return stats;

    } catch (error) {
      console.error(`❌ [TimestampManager] Error getting sync stats for ${entityType}:`, error);
      throw error;
    }
  }
} 