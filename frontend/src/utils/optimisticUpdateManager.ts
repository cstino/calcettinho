// 🎯 FASE 3.2: DATABASE OPTIMIZATIONS - Optimistic Update Manager
// Gestisce update ottimistici e rollback automatico per UX offline-first

import { DataSyncManager } from './dataSyncManager';
import { SmartCache } from './smartCache';

// 🔄 Tipi di operazioni ottimistiche
export enum OptimisticOperationType {
  VOTE_SUBMIT = 'vote_submit',
  PLAYER_UPDATE = 'player_update',
  MATCH_CREATE = 'match_create',
  MATCH_UPDATE = 'match_update',
  PROFILE_UPDATE = 'profile_update'
}

// ⚡ Stato di un update ottimistico
export enum OptimisticUpdateStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

// 📊 Interfaccia per un update ottimistico
export interface OptimisticUpdate {
  id: string;
  type: OptimisticOperationType;
  entityType: string;
  entityId: string;
  timestamp: string;
  status: OptimisticUpdateStatus;
  optimisticData: any;
  originalData: any;
  rollbackData?: any;
  retryCount: number;
  maxRetries: number;
  error?: string;
  userId?: string;
}

// 🎛️ Configurazione per tipo di operazione
interface OptimisticConfig {
  maxRetries: number;
  retryDelay: number;
  autoRollbackTimeout: number;
  cacheStrategy: string;
  conflictResolution: 'server_wins' | 'client_wins' | 'merge';
}

// 📱 OptimisticUpdateManager - Gestione update ottimistici avanzati
export class OptimisticUpdateManager {
  private static instance: OptimisticUpdateManager;
  private pendingUpdates = new Map<string, OptimisticUpdate>();
  private rollbackTimers = new Map<string, NodeJS.Timeout>();
  private syncInProgress = new Set<string>();

  // ⚙️ Configurazioni per tipo di operazione
  private static readonly CONFIG: Record<OptimisticOperationType, OptimisticConfig> = {
    [OptimisticOperationType.VOTE_SUBMIT]: {
      maxRetries: 5,
      retryDelay: 2000,
      autoRollbackTimeout: 30000, // 30 secondi
      cacheStrategy: 'votes',
      conflictResolution: 'client_wins'
    },
    [OptimisticOperationType.PLAYER_UPDATE]: {
      maxRetries: 3,
      retryDelay: 3000,
      autoRollbackTimeout: 60000, // 1 minuto
      cacheStrategy: 'players',
      conflictResolution: 'merge'
    },
    [OptimisticOperationType.MATCH_CREATE]: {
      maxRetries: 3,
      retryDelay: 2000,
      autoRollbackTimeout: 45000, // 45 secondi
      cacheStrategy: 'matches',
      conflictResolution: 'server_wins'
    },
    [OptimisticOperationType.MATCH_UPDATE]: {
      maxRetries: 3,
      retryDelay: 2000,
      autoRollbackTimeout: 45000,
      cacheStrategy: 'matches',
      conflictResolution: 'merge'
    },
    [OptimisticOperationType.PROFILE_UPDATE]: {
      maxRetries: 2,
      retryDelay: 5000,
      autoRollbackTimeout: 120000, // 2 minuti
      cacheStrategy: 'players',
      conflictResolution: 'merge'
    }
  };

  static getInstance(): OptimisticUpdateManager {
    if (!this.instance) {
      this.instance = new OptimisticUpdateManager();
    }
    return this.instance;
  }

  // 🚀 Esegue un update ottimistico
  async performOptimisticUpdate(
    type: OptimisticOperationType,
    entityType: string,
    entityId: string,
    newData: any,
    originalData: any,
    userId?: string
  ): Promise<{ updateId: string; success: boolean }> {
    try {
      const updateId = this.generateUpdateId(type, entityId);
      const config = OptimisticUpdateManager.CONFIG[type];

      console.log(`🚀 [OptimisticUpdate] Starting ${type} for ${entityType}:${entityId}`);

      // 1. Crea record di update ottimistico
      const optimisticUpdate: OptimisticUpdate = {
        id: updateId,
        type,
        entityType,
        entityId,
        timestamp: new Date().toISOString(),
        status: OptimisticUpdateStatus.PENDING,
        optimisticData: newData,
        originalData,
        retryCount: 0,
        maxRetries: config.maxRetries,
        userId
      };

      this.pendingUpdates.set(updateId, optimisticUpdate);

      // 2. Applica immediatamente l'update nella cache
      await this.applyOptimisticDataToCache(optimisticUpdate, config);

      // 3. Avvia timer di rollback automatico
      this.startRollbackTimer(updateId, config.autoRollbackTimeout);

      // 4. Avvia sync in background
      this.startBackgroundSync(updateId);

      console.log(`✅ [OptimisticUpdate] Applied optimistic update ${updateId}`);
      
      return { updateId, success: true };

    } catch (error) {
      console.error(`❌ [OptimisticUpdate] Error in optimistic update:`, error);
      return { updateId: '', success: false };
    }
  }

  // 💾 Applica i dati ottimistici alla cache
  private async applyOptimisticDataToCache(
    update: OptimisticUpdate,
    config: OptimisticConfig
  ): Promise<void> {
    const cacheKey = `${config.cacheStrategy}:${update.entityId}`;
    
    // Salva i dati originali per rollback
    const currentCachedData = await SmartCache.get(cacheKey);
    if (currentCachedData) {
      update.rollbackData = currentCachedData;
    }

    // Applica i nuovi dati
    const mergedData = this.mergeOptimisticData(
      currentCachedData || update.originalData,
      update.optimisticData,
      config.conflictResolution
    );

    await SmartCache.set(cacheKey, mergedData, {
      strategy: config.cacheStrategy,
      priority: 'high',
      tags: ['optimistic', update.type, update.entityId]
    });

    console.log(`💾 [OptimisticUpdate] Applied data to cache: ${cacheKey}`);
  }

  // 🔀 Merge intelligente dei dati ottimistici
  private mergeOptimisticData(
    existing: any,
    optimistic: any,
    strategy: 'server_wins' | 'client_wins' | 'merge'
  ): any {
    switch (strategy) {
      case 'client_wins':
        return { ...existing, ...optimistic };
      
      case 'server_wins':
        return existing;
      
      case 'merge':
      default:
        // Merge intelligente che preserva timestamp più recenti
        const merged = { ...existing };
        
        Object.keys(optimistic).forEach(key => {
          // Sovrascrivi sempre i campi dell'update ottimistico
          // eccetto per campi che potrebbero essere stati aggiornati dal server
          if (!key.includes('timestamp') && !key.includes('version')) {
            merged[key] = optimistic[key];
          }
        });
        
        return merged;
    }
  }

  // ⏰ Avvia timer di rollback automatico
  private startRollbackTimer(updateId: string, timeout: number): void {
    const timer = setTimeout(() => {
      this.rollbackUpdate(updateId, 'Auto-rollback timeout reached');
    }, timeout);

    this.rollbackTimers.set(updateId, timer);
  }

  // 🔄 Avvia sync in background
  private async startBackgroundSync(updateId: string): Promise<void> {
    const update = this.pendingUpdates.get(updateId);
    if (!update || this.syncInProgress.has(updateId)) {
      return;
    }

    this.syncInProgress.add(updateId);
    update.status = OptimisticUpdateStatus.SYNCING;

    try {
      console.log(`🔄 [OptimisticUpdate] Starting background sync for ${updateId}`);

      // Aggiungi alla coda di sync
      await DataSyncManager.addToQueue({
        id: updateId,
        type: this.mapOperationTypeToSyncType(update.type),
        data: update.optimisticData,
        priority: 'HIGH',
        timestamp: update.timestamp,
        retryCount: 0,
        metadata: {
          entityType: update.entityType,
          entityId: update.entityId,
          optimisticUpdateId: updateId
        }
      });

      // Il DataSyncManager gestirà il sync effettivo
      // Qui attendiamo il risultato tramite evento
      this.listenForSyncResult(updateId);

    } catch (error) {
      console.error(`❌ [OptimisticUpdate] Error starting background sync:`, error);
      this.handleSyncFailure(updateId, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // 👂 Ascolta il risultato del sync
  private listenForSyncResult(updateId: string): void {
    // Simula l'attesa del risultato del sync
    // In un'implementazione reale, questo userebbe eventi o callback
    const checkInterval = setInterval(async () => {
      const update = this.pendingUpdates.get(updateId);
      if (!update) {
        clearInterval(checkInterval);
        return;
      }

      // Controlla se il sync è completato
      // Questa logica dovrebbe essere integrata con il DataSyncManager
      const isComplete = await this.checkSyncCompletion(updateId);
      
      if (isComplete.completed) {
        clearInterval(checkInterval);
        if (isComplete.success) {
          this.handleSyncSuccess(updateId, isComplete.result);
        } else {
          this.handleSyncFailure(updateId, isComplete.error || 'Sync failed');
        }
      }
    }, 1000);

    // Timeout del controllo dopo 5 minuti
    setTimeout(() => {
      clearInterval(checkInterval);
      const update = this.pendingUpdates.get(updateId);
      if (update && update.status === OptimisticUpdateStatus.SYNCING) {
        this.handleSyncFailure(updateId, 'Sync timeout');
      }
    }, 300000);
  }

  // ✅ Gestisce successo del sync
  private async handleSyncSuccess(updateId: string, result?: any): Promise<void> {
    const update = this.pendingUpdates.get(updateId);
    if (!update) return;

    console.log(`✅ [OptimisticUpdate] Sync successful for ${updateId}`);

    update.status = OptimisticUpdateStatus.SUCCESS;
    
    // Pulisci timer di rollback
    this.clearRollbackTimer(updateId);

    // Aggiorna cache con dati server se diversi
    if (result && result.data) {
      const config = OptimisticUpdateManager.CONFIG[update.type];
      const cacheKey = `${config.cacheStrategy}:${update.entityId}`;
      await SmartCache.set(cacheKey, result.data, {
        strategy: config.cacheStrategy,
        priority: 'high',
        tags: ['synced', update.entityId]
      });
    }

    // Rimuovi dalla gestione
    this.pendingUpdates.delete(updateId);
    this.syncInProgress.delete(updateId);

    // Notifica il successo
    this.notifyUpdateResult(updateId, true);
  }

  // ❌ Gestisce fallimento del sync
  private async handleSyncFailure(updateId: string, error: string): Promise<void> {
    const update = this.pendingUpdates.get(updateId);
    if (!update) return;

    console.log(`❌ [OptimisticUpdate] Sync failed for ${updateId}: ${error}`);

    update.retryCount++;
    update.error = error;

    if (update.retryCount < update.maxRetries) {
      // Riprova dopo delay
      const config = OptimisticUpdateManager.CONFIG[update.type];
      const delay = config.retryDelay * Math.pow(2, update.retryCount - 1); // Exponential backoff
      
      console.log(`🔄 [OptimisticUpdate] Retrying ${updateId} in ${delay}ms (attempt ${update.retryCount}/${update.maxRetries})`);
      
      setTimeout(() => {
        this.syncInProgress.delete(updateId);
        this.startBackgroundSync(updateId);
      }, delay);
      
    } else {
      // Troppi fallimenti, rollback
      update.status = OptimisticUpdateStatus.FAILED;
      await this.rollbackUpdate(updateId, `Max retries exceeded: ${error}`);
    }
  }

  // 🔙 Esegue rollback di un update ottimistico
  private async rollbackUpdate(updateId: string, reason: string): Promise<void> {
    const update = this.pendingUpdates.get(updateId);
    if (!update) return;

    console.log(`🔙 [OptimisticUpdate] Rolling back ${updateId}: ${reason}`);

    try {
      const config = OptimisticUpdateManager.CONFIG[update.type];
      const cacheKey = `${config.cacheStrategy}:${update.entityId}`;

      // Ripristina dati originali nella cache
      if (update.rollbackData) {
        await SmartCache.set(cacheKey, update.rollbackData, {
          strategy: config.cacheStrategy,
          priority: 'high',
          tags: ['rollback', update.entityId]
        });
      } else {
        // Se non abbiamo dati di rollback, rimuovi dalla cache
        await SmartCache.delete(cacheKey);
      }

      update.status = OptimisticUpdateStatus.ROLLED_BACK;
      update.error = reason;

      // Pulisci timer e riferimenti
      this.clearRollbackTimer(updateId);
      this.syncInProgress.delete(updateId);

      console.log(`✅ [OptimisticUpdate] Rollback completed for ${updateId}`);

      // Notifica il rollback
      this.notifyUpdateResult(updateId, false, reason);

    } catch (error) {
      console.error(`❌ [OptimisticUpdate] Error during rollback of ${updateId}:`, error);
    }

    // Rimuovi dalla gestione
    this.pendingUpdates.delete(updateId);
  }

  // 🔗 Mappa tipo operazione a tipo sync
  private mapOperationTypeToSyncType(operation: OptimisticOperationType): string {
    switch (operation) {
      case OptimisticOperationType.VOTE_SUBMIT:
        return 'VOTE';
      case OptimisticOperationType.PLAYER_UPDATE:
      case OptimisticOperationType.PROFILE_UPDATE:
        return 'PROFILE_UPDATE';
      case OptimisticOperationType.MATCH_CREATE:
      case OptimisticOperationType.MATCH_UPDATE:
        return 'MATCH_ACTION';
      default:
        return 'USER_PREFERENCE';
    }
  }

  // ✓ Controlla completamento sync (stub)
  private async checkSyncCompletion(updateId: string): Promise<{
    completed: boolean;
    success?: boolean;
    result?: any;
    error?: string;
  }> {
    // Questa implementazione dovrebbe integrarsi con il DataSyncManager
    // Per ora simula un controllo
    return {
      completed: false
    };
  }

  // 🔤 Genera ID univoco per update
  private generateUpdateId(type: OptimisticOperationType, entityId: string): string {
    return `${type}_${entityId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 🧹 Pulisce timer di rollback
  private clearRollbackTimer(updateId: string): void {
    const timer = this.rollbackTimers.get(updateId);
    if (timer) {
      clearTimeout(timer);
      this.rollbackTimers.delete(updateId);
    }
  }

  // 📢 Notifica risultato dell'update
  private notifyUpdateResult(updateId: string, success: boolean, error?: string): void {
    // Emette evento personalizzato per notificare i componenti
    const event = new CustomEvent('optimisticUpdateResult', {
      detail: { updateId, success, error }
    });
    window.dispatchEvent(event);
  }

  // 📊 Statistiche degli update ottimistici
  getStats(): {
    pending: number;
    syncing: number;
    successful: number;
    failed: number;
    totalUpdates: number;
  } {
    const updates = Array.from(this.pendingUpdates.values());
    
    return {
      pending: updates.filter(u => u.status === OptimisticUpdateStatus.PENDING).length,
      syncing: updates.filter(u => u.status === OptimisticUpdateStatus.SYNCING).length,
      successful: updates.filter(u => u.status === OptimisticUpdateStatus.SUCCESS).length,
      failed: updates.filter(u => u.status === OptimisticUpdateStatus.FAILED).length,
      totalUpdates: updates.length
    };
  }

  // 🔄 Forza sync di tutti gli update pending
  async syncAllPending(): Promise<void> {
    const pendingUpdates = Array.from(this.pendingUpdates.values())
      .filter(u => u.status === OptimisticUpdateStatus.PENDING);

    console.log(`🔄 [OptimisticUpdate] Force syncing ${pendingUpdates.length} pending updates`);

    for (const update of pendingUpdates) {
      if (!this.syncInProgress.has(update.id)) {
        this.startBackgroundSync(update.id);
      }
    }
  }

  // 🧹 Pulizia update completati
  cleanup(): void {
    const completedUpdates = Array.from(this.pendingUpdates.entries())
      .filter(([, update]) => 
        update.status === OptimisticUpdateStatus.SUCCESS || 
        update.status === OptimisticUpdateStatus.ROLLED_BACK
      );

    for (const [updateId] of completedUpdates) {
      this.pendingUpdates.delete(updateId);
      this.clearRollbackTimer(updateId);
    }

    console.log(`🧹 [OptimisticUpdate] Cleaned up ${completedUpdates.length} completed updates`);
  }
} 