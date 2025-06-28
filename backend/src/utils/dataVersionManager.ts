// 🎯 FASE 3.2: DATABASE OPTIMIZATIONS - Data Version Manager
// Gestisce versioning dei dati e conflict resolution avanzato

import Airtable from 'airtable';
import { TimestampManager, TrackedEntity, TimestampFields, TRACKED_ENTITIES } from './timestampManager';

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('Missing Airtable configuration for DataVersionManager');
}

const base = Airtable.base(baseId);

// 🔄 Strategie di risoluzione conflitti
export enum ConflictResolutionStrategy {
  SERVER_WINS = 'server_wins',
  CLIENT_WINS = 'client_wins',
  MERGE_AUTOMATIC = 'merge_automatic',
  MERGE_MANUAL = 'merge_manual',
  LATEST_TIMESTAMP = 'latest_timestamp',
  HIGHEST_VERSION = 'highest_version'
}

// ⚡ Risultato di una operazione di versioning
export interface VersionResult {
  success: boolean;
  action: 'created' | 'updated' | 'conflict' | 'skipped';
  recordId: string;
  version: number;
  conflictData?: ConflictData;
  error?: string;
}

// 🥊 Dati di conflitto
export interface ConflictData {
  entityType: TrackedEntity;
  primaryKey: string;
  serverVersion: number;
  clientVersion: number;
  serverData: any;
  clientData: any;
  serverTimestamp: string;
  clientTimestamp: string;
  suggestedResolution: ConflictResolutionStrategy;
  mergedData?: any;
}

// 📊 Snapshot di una versione
export interface DataSnapshot {
  recordId: string;
  entityType: TrackedEntity;
  version: number;
  timestamp: string;
  data: any;
  checksum: string;
  createdBy?: string;
}

// 📱 DataVersionManager - Sistema avanzato di versioning
export class DataVersionManager {

  // 🔄 Applica un update con gestione versioning
  static async applyVersionedUpdate(
    entityType: TrackedEntity,
    primaryKey: string,
    newData: any,
    clientVersion: number,
    clientTimestamp: string,
    modifiedBy?: string,
    strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.LATEST_TIMESTAMP
  ): Promise<VersionResult> {
    try {
      console.log(`🔄 [DataVersionManager] Applying update for ${entityType}:${primaryKey} (client v${clientVersion})`);

      // 1. Cerca record esistente
      const existingRecord = await this.findRecordByPrimaryKey(entityType, primaryKey);

      if (!existingRecord) {
        // Record non esiste, crealo
        return await this.createNewVersionedRecord(entityType, newData, modifiedBy);
      }

      // 2. Controlla versioni e timestamp per conflitti
      const serverVersion = existingRecord.get('version') as number || 1;
      const serverTimestamp = existingRecord.get('updatedAt') as string;

      const hasVersionConflict = clientVersion < serverVersion;
      const hasTimestampConflict = new Date(serverTimestamp) > new Date(clientTimestamp);

      if (hasVersionConflict || hasTimestampConflict) {
        // 3. Gestisce conflitto
        return await this.resolveConflict(
          entityType,
          existingRecord,
          newData,
          clientVersion,
          clientTimestamp,
          modifiedBy,
          strategy
        );
      }

      // 4. Nessun conflitto, applica update normale
      return await this.performVersionedUpdate(
        entityType,
        existingRecord.id,
        newData,
        serverVersion + 1,
        modifiedBy
      );

    } catch (error) {
      console.error(`❌ [DataVersionManager] Error in versioned update:`, error);
      return {
        success: false,
        action: 'conflict',
        recordId: '',
        version: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 🆕 Crea nuovo record con versioning
  private static async createNewVersionedRecord(
    entityType: TrackedEntity,
    data: any,
    createdBy?: string
  ): Promise<VersionResult> {
    const timestamps = TimestampManager.getInitialTimestamps(createdBy);
    
    const recordData = {
      ...data,
      ...timestamps
    };

    const record = await base(entityType).create(recordData);
    
    console.log(`✅ [DataVersionManager] Created new versioned record ${entityType}:${record.id} (v1)`);

    return {
      success: true,
      action: 'created',
      recordId: record.id,
      version: 1
    };
  }

  // 🔄 Esegue update con incremento versione
  private static async performVersionedUpdate(
    entityType: TrackedEntity,
    recordId: string,
    data: any,
    newVersion: number,
    modifiedBy?: string
  ): Promise<VersionResult> {
    const now = TimestampManager.getCurrentTimestamp();
    
    const updateData = {
      ...data,
      version: newVersion,
      updatedAt: now,
      syncStatus: 'synced',
      ...(modifiedBy && { lastModifiedBy: modifiedBy })
    };

    await base(entityType).update(recordId, updateData);
    
    console.log(`✅ [DataVersionManager] Updated record ${entityType}:${recordId} to v${newVersion}`);

    return {
      success: true,
      action: 'updated',
      recordId,
      version: newVersion
    };
  }

  // 🥊 Risolve conflitti tra versioni
  private static async resolveConflict(
    entityType: TrackedEntity,
    serverRecord: any,
    clientData: any,
    clientVersion: number,
    clientTimestamp: string,
    modifiedBy?: string,
    strategy: ConflictResolutionStrategy
  ): Promise<VersionResult> {
    const serverVersion = serverRecord.get('version') as number || 1;
    const serverTimestamp = serverRecord.get('updatedAt') as string;
    const serverData = this.extractCleanData(serverRecord);

    console.log(`🥊 [DataVersionManager] Conflict detected: server v${serverVersion} vs client v${clientVersion}`);

    const conflictData: ConflictData = {
      entityType,
      primaryKey: this.extractPrimaryKey(serverRecord, entityType),
      serverVersion,
      clientVersion,
      serverData,
      clientData,
      serverTimestamp,
      clientTimestamp,
      suggestedResolution: strategy
    };

    let resolvedData: any;
    let finalAction: 'updated' | 'conflict' = 'conflict';

    switch (strategy) {
      case ConflictResolutionStrategy.SERVER_WINS:
        // Server vince, nessun update
        console.log(`🏆 [DataVersionManager] Conflict resolved: SERVER WINS`);
        return {
          success: true,
          action: 'skipped',
          recordId: serverRecord.id,
          version: serverVersion,
          conflictData
        };

      case ConflictResolutionStrategy.CLIENT_WINS:
        // Client vince, forza update
        resolvedData = clientData;
        finalAction = 'updated';
        console.log(`🏆 [DataVersionManager] Conflict resolved: CLIENT WINS`);
        break;

      case ConflictResolutionStrategy.LATEST_TIMESTAMP:
        // Timestamp più recente vince
        if (new Date(clientTimestamp) > new Date(serverTimestamp)) {
          resolvedData = clientData;
          finalAction = 'updated';
          console.log(`🏆 [DataVersionManager] Conflict resolved: CLIENT WINS (newer timestamp)`);
        } else {
          console.log(`🏆 [DataVersionManager] Conflict resolved: SERVER WINS (newer timestamp)`);
          return {
            success: true,
            action: 'skipped',
            recordId: serverRecord.id,
            version: serverVersion,
            conflictData
          };
        }
        break;

      case ConflictResolutionStrategy.MERGE_AUTOMATIC:
        // Merge automatico
        resolvedData = this.performAutomaticMerge(serverData, clientData, entityType);
        conflictData.mergedData = resolvedData;
        finalAction = 'updated';
        console.log(`🏆 [DataVersionManager] Conflict resolved: AUTOMATIC MERGE`);
        break;

      case ConflictResolutionStrategy.MERGE_MANUAL:
        // Require manual resolution
        console.log(`⏸️ [DataVersionManager] Conflict requires manual resolution`);
        return {
          success: false,
          action: 'conflict',
          recordId: serverRecord.id,
          version: serverVersion,
          conflictData
        };

      default:
        // Fallback to server wins
        return {
          success: true,
          action: 'skipped',
          recordId: serverRecord.id,
          version: serverVersion,
          conflictData
        };
    }

    // Applica la risoluzione
    if (finalAction === 'updated' && resolvedData) {
      return await this.performVersionedUpdate(
        entityType,
        serverRecord.id,
        resolvedData,
        Math.max(serverVersion, clientVersion) + 1,
        modifiedBy
      );
    }

    return {
      success: false,
      action: 'conflict',
      recordId: serverRecord.id,
      version: serverVersion,
      conflictData
    };
  }

  // 🔀 Merge automatico intelligente
  private static performAutomaticMerge(serverData: any, clientData: any, entityType: TrackedEntity): any {
    // Strategia di merge specifica per tipo di entità
    switch (entityType) {
      case TRACKED_ENTITIES.PLAYERS:
        return this.mergePlayerData(serverData, clientData);
      
      case TRACKED_ENTITIES.VOTES:
        // Per i voti, client vince sempre (last writer wins)
        return clientData;
        
      case TRACKED_ENTITIES.MATCHES:
        return this.mergeMatchData(serverData, clientData);
        
      default:
        // Merge generico: combina campi non conflittuali
        return { ...serverData, ...clientData };
    }
  }

  // 👤 Merge specifico per dati giocatore
  private static mergePlayerData(serverData: any, clientData: any): any {
    return {
      ...serverData,
      ...clientData,
      // Mantieni le statistiche più alte (presume miglioramento)
      Attacco: Math.max(serverData.Attacco || 0, clientData.Attacco || 0),
      Difesa: Math.max(serverData.Difesa || 0, clientData.Difesa || 0),
      Velocità: Math.max(serverData.Velocità || 0, clientData.Velocità || 0),
      Forza: Math.max(serverData.Forza || 0, clientData.Forza || 0),
      Passaggio: Math.max(serverData.Passaggio || 0, clientData.Passaggio || 0),
      Portiere: Math.max(serverData.Portiere || 0, clientData.Portiere || 0)
    };
  }

  // ⚽ Merge specifico per dati match
  private static mergeMatchData(serverData: any, clientData: any): any {
    return {
      ...serverData,
      ...clientData,
      // Preserva stato di votazione più avanzato
      voting_status: this.getAdvancedVotingStatus(serverData.voting_status, clientData.voting_status),
      // Mantieni timestamp più recenti
      voting_started_at: serverData.voting_started_at || clientData.voting_started_at,
      voting_closed_at: serverData.voting_closed_at || clientData.voting_closed_at
    };
  }

  // 🗳️ Determina stato di votazione più avanzato
  private static getAdvancedVotingStatus(serverStatus: string, clientStatus: string): string {
    const statusOrder = ['pending', 'open', 'closed'];
    const serverIndex = statusOrder.indexOf(serverStatus) || 0;
    const clientIndex = statusOrder.indexOf(clientStatus) || 0;
    return statusOrder[Math.max(serverIndex, clientIndex)];
  }

  // 🔍 Trova record tramite chiave primaria
  private static async findRecordByPrimaryKey(entityType: TrackedEntity, primaryKey: string): Promise<any | null> {
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
          // Per entità complesse come votes, usa il recordId
          const records = await base(entityType).select().all();
          return records.find(r => r.id === primaryKey) || null;
      }

      const records = await base(entityType).select({
        filterByFormula: filterFormula
      }).all();

      return records.length > 0 ? records[0] : null;

    } catch (error) {
      console.error(`❌ [DataVersionManager] Error finding record by key ${primaryKey}:`, error);
      return null;
    }
  }

  // 🧹 Estrae dati puliti (senza metadata)
  private static extractCleanData(record: any): any {
    const fields = record.fields;
    const { createdAt, updatedAt, version, lastModifiedBy, syncStatus, ...cleanData } = fields;
    return cleanData;
  }

  // 🆔 Estrae chiave primaria
  private static extractPrimaryKey(record: any, entityType: TrackedEntity): string {
    switch (entityType) {
      case TRACKED_ENTITIES.PLAYERS:
      case TRACKED_ENTITIES.WHITELIST:
        return record.get('email') as string || record.id;
      case TRACKED_ENTITIES.MATCHES:
        return record.get('IDmatch') as string || record.id;
      case TRACKED_ENTITIES.PLAYER_STATS:
        return record.get('playerEmail') as string || record.id;
      default:
        return record.id;
    }
  }

  // 📷 Crea snapshot di una versione
  static async createSnapshot(
    entityType: TrackedEntity,
    recordId: string,
    description?: string
  ): Promise<DataSnapshot> {
    try {
      const record = await base(entityType).find(recordId);
      const data = this.extractCleanData(record);
      const checksum = this.generateChecksum(data);

      const snapshot: DataSnapshot = {
        recordId,
        entityType,
        version: record.get('version') as number || 1,
        timestamp: TimestampManager.getCurrentTimestamp(),
        data,
        checksum,
        createdBy: description
      };

      console.log(`📷 [DataVersionManager] Created snapshot for ${entityType}:${recordId} (checksum: ${checksum.slice(0, 8)}...)`);
      
      return snapshot;

    } catch (error) {
      console.error(`❌ [DataVersionManager] Error creating snapshot:`, error);
      throw error;
    }
  }

  // 🔐 Genera checksum per integrità dati
  private static generateChecksum(data: any): string {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    return Buffer.from(jsonString).toString('base64').slice(0, 16);
  }

  // 📊 Statistiche di versioning
  static async getVersioningStats(entityType: TrackedEntity): Promise<{
    totalRecords: number;
    averageVersion: number;
    maxVersion: number;
    conflictsResolved: number;
    lastConflict?: string;
  }> {
    try {
      const records = await base(entityType).select({
        fields: ['version', 'updatedAt', 'syncStatus']
      }).all();

      const versions = records.map(r => r.get('version') as number || 1);
      const conflicts = records.filter(r => r.get('syncStatus') === 'conflict');

      const stats = {
        totalRecords: records.length,
        averageVersion: versions.length > 0 ? versions.reduce((a, b) => a + b, 0) / versions.length : 1,
        maxVersion: Math.max(...versions, 1),
        conflictsResolved: conflicts.length,
        lastConflict: conflicts.length > 0 ? 
          conflicts
            .map(r => r.get('updatedAt') as string)
            .sort()
            .reverse()[0] : undefined
      };

      console.log(`📊 [DataVersionManager] Versioning stats for ${entityType}:`, stats);
      return stats;

    } catch (error) {
      console.error(`❌ [DataVersionManager] Error getting versioning stats:`, error);
      throw error;
    }
  }
} 