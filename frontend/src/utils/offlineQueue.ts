/**
 * 🔄 OFFLINE QUEUE SYSTEM
 * Gestisce le azioni utente offline con retry intelligente e conflict resolution
 */

interface QueueAction {
  id: string;
  type: 'VOTE' | 'PROFILE_UPDATE' | 'MATCH_ACTION' | 'USER_PREFERENCE';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  userId?: string;
  conflictResolution?: 'OVERWRITE' | 'MERGE' | 'USER_CHOICE';
}

interface QueueMetrics {
  totalActions: number;
  pendingActions: number;
  failedActions: number;
  syncedActions: number;
  lastSyncAttempt: number;
  avgRetryTime: number;
}

class OfflineQueueManager {
  private queue: QueueAction[] = [];
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private syncListeners: Set<(metrics: QueueMetrics) => void> = new Set();
  private storageKey = 'calcettinho_offline_queue';
  private metricsKey = 'calcettinho_queue_metrics';

  constructor() {
    this.initializeQueue();
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  /**
   * 🚀 Inizializza la coda dal localStorage
   */
  private async initializeQueue(): Promise<void> {
    try {
      const storedQueue = localStorage.getItem(this.storageKey);
      if (storedQueue) {
        this.queue = JSON.parse(storedQueue);
      }

      // Cleanup azioni troppo vecchie (>24h)
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      this.queue = this.queue.filter(action => 
        now - action.timestamp < dayMs
      );

      this.saveQueue();
    } catch (error) {
      console.error('Error initializing offline queue:', error);
      this.queue = [];
    }
  }

  /**
   * 🎯 Setup event listeners per network status
   */
  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Back online - starting sync');
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📱 Gone offline - queuing mode activated');
      this.isOnline = false;
    });

    // Background sync se supportato
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      this.registerBackgroundSync();
    }
  }

  /**
   * 🔄 Registra background sync con service worker
   */
  private async registerBackgroundSync(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('offline-queue-sync');
      console.log('🔄 Background sync registered');
    } catch (error) {
      console.warn('Background sync not supported:', error);
    }
  }

  /**
   * ➕ Aggiunge un'azione alla coda
   */
  public addAction(
    type: QueueAction['type'],
    data: any,
    endpoint: string,
    method: QueueAction['method'] = 'POST',
    priority: QueueAction['priority'] = 'MEDIUM',
    conflictResolution: QueueAction['conflictResolution'] = 'MERGE'
  ): string {
    const action: QueueAction = {
      id: this.generateId(),
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.getMaxRetries(type, priority),
      endpoint,
      method,
      priority,
      conflictResolution,
      userId: data.userId || data.voterEmail || 'anonymous'
    };

    // Inserisci in base alla priorità
    this.insertByPriority(action);
    this.saveQueue();
    this.notifyListeners();

    console.log(`📦 Queued ${type} action:`, action.id);

    // Prova subito se online
    if (this.isOnline && !this.isSyncing) {
      this.processQueue();
    }

    return action.id;
  }

  /**
   * 🎯 Inserisce azione in base alla priorità
   */
  private insertByPriority(action: QueueAction): void {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const actionPriority = priorityOrder[action.priority];

    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (priorityOrder[this.queue[i].priority] > actionPriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, action);
  }

  /**
   * ⚙️ Determina retry massimi in base al tipo e priorità
   */
  private getMaxRetries(type: QueueAction['type'], priority: QueueAction['priority']): number {
    const baseRetries = {
      VOTE: 5,
      PROFILE_UPDATE: 3,
      MATCH_ACTION: 4,
      USER_PREFERENCE: 2
    };

    const priorityMultiplier = {
      HIGH: 1.5,
      MEDIUM: 1,
      LOW: 0.5
    };

    return Math.ceil(baseRetries[type] * priorityMultiplier[priority]);
  }

  /**
   * 🔄 Processa la coda di azioni
   */
  public async processQueue(): Promise<void> {
    if (!this.isOnline || this.isSyncing || this.queue.length === 0) {
      return;
    }

    this.isSyncing = true;
    console.log(`🔄 Processing queue: ${this.queue.length} actions`);

    const results = {
      synced: 0,
      failed: 0,
      skipped: 0
    };

    // Processa in ordine di priorità
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const action = this.queue[i];

      try {
        const success = await this.executeAction(action);
        
        if (success) {
          this.queue.splice(i, 1);
          results.synced++;
          console.log(`✅ Synced action: ${action.type} - ${action.id}`);
        } else {
          action.retryCount++;
          if (action.retryCount >= action.maxRetries) {
            console.warn(`❌ Max retries reached for: ${action.type} - ${action.id}`);
            this.queue.splice(i, 1);
            results.failed++;
          } else {
            results.skipped++;
            console.log(`⏭️ Retry later: ${action.type} - ${action.id} (${action.retryCount}/${action.maxRetries})`);
          }
        }
      } catch (error) {
        console.error(`💥 Error processing action ${action.id}:`, error);
        action.retryCount++;
        if (action.retryCount >= action.maxRetries) {
          this.queue.splice(i, 1);
          results.failed++;
        } else {
          results.skipped++;
        }
      }

      // Pausa tra azioni per non sovraccaricare
      await this.delay(100);
    }

    this.saveQueue();
    this.updateMetrics(results);
    this.notifyListeners();
    this.isSyncing = false;

    console.log(`🎯 Queue processing completed:`, results);
  }

  /**
   * 🎯 Esegue una singola azione
   */
  private async executeAction(action: QueueAction): Promise<boolean> {
    try {
      const response = await fetch(action.endpoint, {
        method: action.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Action': 'true',
          'X-Action-ID': action.id,
          'X-Original-Timestamp': action.timestamp.toString()
        },
        body: JSON.stringify(action.data)
      });

      if (response.ok) {
        return true;
      }

      // Gestisci conflict (409)
      if (response.status === 409) {
        return await this.handleConflict(action, response);
      }

      // Altri errori client (4xx) non sono retry-able
      if (response.status >= 400 && response.status < 500) {
        console.warn(`🚫 Client error for action ${action.id}: ${response.status}`);
        return true; // Rimuovi dalla coda (non retry-able)
      }

      return false; // Server error - retry
    } catch (error) {
      console.error(`💥 Network error for action ${action.id}:`, error);
      return false; // Network error - retry
    }
  }

  /**
   * 🔀 Gestisce conflitti di dati
   */
  private async handleConflict(action: QueueAction, response: Response): Promise<boolean> {
    try {
      const conflictData = await response.json();
      
      switch (action.conflictResolution) {
        case 'OVERWRITE':
          // Force update con header speciale
          const overwriteResponse = await fetch(action.endpoint, {
            method: action.method,
            headers: {
              'Content-Type': 'application/json',
              'X-Force-Update': 'true',
              'X-Action-ID': action.id
            },
            body: JSON.stringify(action.data)
          });
          return overwriteResponse.ok;

        case 'MERGE':
          // Prova a mergere i dati
          const mergedData = this.mergeConflictData(action.data, conflictData.current);
          const mergeResponse = await fetch(action.endpoint, {
            method: action.method,
            headers: {
              'Content-Type': 'application/json',
              'X-Merge-Update': 'true',
              'X-Action-ID': action.id
            },
            body: JSON.stringify(mergedData)
          });
          return mergeResponse.ok;

        case 'USER_CHOICE':
          // Store per mostrare UI di risoluzione conflitto
          this.storeConflictForUserResolution(action, conflictData);
          return true; // Rimuovi dalla coda, l'utente deciderà

        default:
          return false;
      }
    } catch (error) {
      console.error('Error handling conflict:', error);
      return false;
    }
  }

  /**
   * 🔀 Merge intelligente dei dati in conflitto
   */
  private mergeConflictData(localData: any, serverData: any): any {
    // Logica di merge specifica per tipo di dato
    if (localData.type === 'VOTE') {
      // Per i voti, usa il timestamp più recente
      return localData.timestamp > serverData.timestamp ? localData : serverData;
    }

    if (localData.type === 'PROFILE_UPDATE') {
      // Per profili, merge field per field prendendo il più recente
      const merged = { ...serverData };
      Object.keys(localData).forEach(key => {
        if (key !== 'updatedAt' && localData[key] !== undefined) {
          merged[key] = localData[key];
        }
      });
      merged.updatedAt = Math.max(localData.updatedAt || 0, serverData.updatedAt || 0);
      return merged;
    }

    // Default: usa dati locali
    return localData;
  }

  /**
   * 💾 Store conflitto per risoluzione utente
   */
  private storeConflictForUserResolution(action: QueueAction, conflictData: any): void {
    const conflict = {
      id: action.id,
      type: action.type,
      localData: action.data,
      serverData: conflictData.current,
      timestamp: Date.now()
    };

    const conflicts = JSON.parse(localStorage.getItem('calcettinho_conflicts') || '[]');
    conflicts.push(conflict);
    localStorage.setItem('calcettinho_conflicts', JSON.stringify(conflicts));

    // Trigger evento per UI
    window.dispatchEvent(new CustomEvent('offline-conflict', { detail: conflict }));
  }

  /**
   * 📊 Aggiorna metriche
   */
  private updateMetrics(results: { synced: number; failed: number; skipped: number }): void {
    const current = this.getMetrics();
    const updated: QueueMetrics = {
      totalActions: current.totalActions + results.synced + results.failed,
      pendingActions: this.queue.length,
      failedActions: current.failedActions + results.failed,
      syncedActions: current.syncedActions + results.synced,
      lastSyncAttempt: Date.now(),
      avgRetryTime: this.calculateAvgRetryTime()
    };

    localStorage.setItem(this.metricsKey, JSON.stringify(updated));
  }

  /**
   * 📈 Calcola tempo medio retry
   */
  private calculateAvgRetryTime(): number {
    if (this.queue.length === 0) return 0;
    
    const totalAge = this.queue.reduce((sum, action) => 
      sum + (Date.now() - action.timestamp), 0
    );
    
    return Math.round(totalAge / this.queue.length);
  }

  /**
   * 📊 Ottieni metriche correnti
   */
  public getMetrics(): QueueMetrics {
    const stored = localStorage.getItem(this.metricsKey);
    const defaultMetrics: QueueMetrics = {
      totalActions: 0,
      pendingActions: this.queue.length,
      failedActions: 0,
      syncedActions: 0,
      lastSyncAttempt: 0,
      avgRetryTime: 0
    };

    return stored ? { ...defaultMetrics, ...JSON.parse(stored) } : defaultMetrics;
  }

  /**
   * 🗑️ Pulisci coda e metriche
   */
  public clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    localStorage.removeItem(this.metricsKey);
    this.notifyListeners();
  }

  /**
   * 👂 Listener per aggiornamenti
   */
  public addSyncListener(callback: (metrics: QueueMetrics) => void): () => void {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }

  /**
   * 🔄 Sync periodico
   */
  private startPeriodicSync(): void {
    setInterval(() => {
      if (this.isOnline && this.queue.length > 0 && !this.isSyncing) {
        this.processQueue();
      }
    }, 30000); // Ogni 30 secondi
  }

  // Utility methods
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveQueue(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
  }

  private notifyListeners(): void {
    const metrics = this.getMetrics();
    this.syncListeners.forEach(callback => callback(metrics));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public getters
  public get queueLength(): number { return this.queue.length; }
  public get isProcessing(): boolean { return this.isSyncing; }
  public get onlineStatus(): boolean { return this.isOnline; }
}

// Export singleton instance
export const offlineQueue = new OfflineQueueManager();
export type { QueueAction, QueueMetrics }; 