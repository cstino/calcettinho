/**
 * 📡 DATA SYNC MANAGER
 * Gestisce sincronizzazione intelligente dei dati critici con priorità e background sync
 */

import { smartCache } from './smartCache';
import { cacheStrategies } from './cacheStrategies';

interface SyncItem {
  id: string;
  type: 'PLAYERS' | 'STATS' | 'MATCHES' | 'PROFILES' | 'VOTING';
  endpoint: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  frequency: number; // minuti
  lastSync: number;
  retryCount: number;
  data?: any;
  status: 'PENDING' | 'SYNCING' | 'SUCCESS' | 'ERROR' | 'CONFLICT';
}

interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  conflictsSyncs: number;
  avgSyncTime: number;
  lastFullSync: number;
  dataFreshness: Record<string, number>;
  networkOptimization: {
    bandwidthSaved: number;
    requestsAvoided: number;
    cacheHitRate: number;
  };
}

interface NetworkInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

class DataSyncManager {
  private syncItems: Map<string, SyncItem> = new Map();
  private isSyncing: boolean = false;
  private syncListeners: Set<(metrics: SyncMetrics) => void> = new Set();
  private metricsKey = 'calcettinho_sync_metrics';
  private networkInfo: NetworkInfo | null = null;
  private priorityWeights = {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 5,
    LOW: 10
  };

  constructor() {
    this.initializeSync();
    this.setupNetworkMonitoring();
    this.setupBackgroundSync();
    this.startSyncScheduler();
  }

  /**
   * 🚀 Inizializza sistema di sync
   */
  private initializeSync(): void {
    // Definisci sync items critici
    this.addSyncItem({
      id: 'players-data',
      type: 'PLAYERS',
      endpoint: '/api/players',
      priority: 'HIGH',
      frequency: 30, // 30 minuti
      lastSync: 0,
      retryCount: 0,
      status: 'PENDING'
    });

    this.addSyncItem({
      id: 'stats-data',
      type: 'STATS',
      endpoint: '/api/player-stats',
      priority: 'CRITICAL',
      frequency: 15, // 15 minuti
      lastSync: 0,
      retryCount: 0,
      status: 'PENDING'
    });

    this.addSyncItem({
      id: 'matches-data',
      type: 'MATCHES',
      endpoint: '/api/matches',
      priority: 'HIGH',
      frequency: 10, // 10 minuti durante match day
      lastSync: 0,
      retryCount: 0,
      status: 'PENDING'
    });

    this.addSyncItem({
      id: 'voting-data',
      type: 'VOTING',
      endpoint: '/api/votes',
      priority: 'CRITICAL',
      frequency: 5, // 5 minuti
      lastSync: 0,
      retryCount: 0,
      status: 'PENDING'
    });

    console.log('📡 Data Sync Manager initialized with', this.syncItems.size, 'sync items');
  }

  /**
   * 📡 Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    // Network Information API
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      this.networkInfo = {
        effectiveType: conn.effectiveType || 'unknown',
        downlink: conn.downlink || 1,
        rtt: conn.rtt || 100,
        saveData: conn.saveData || false
      };

      conn.addEventListener('change', () => {
        this.networkInfo = {
          effectiveType: conn.effectiveType || 'unknown',
          downlink: conn.downlink || 1,
          rtt: conn.rtt || 100,
          saveData: conn.saveData || false
        };
        console.log('📶 Network changed:', this.networkInfo);
        this.adjustSyncStrategy();
      });
    }

    // Network status events
    window.addEventListener('online', () => {
      console.log('🌐 Back online - resuming data sync');
      this.prioritySync();
    });

    window.addEventListener('offline', () => {
      console.log('📱 Gone offline - pausing data sync');
    });
  }

  /**
   * 🔄 Setup background sync
   */
  private async setupBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('data-sync');
        console.log('🔄 Background sync registered for data');
      } catch (error) {
        console.warn('Background sync not supported:', error);
      }
    }
  }

  /**
   * ➕ Aggiunge sync item
   */
  private addSyncItem(item: SyncItem): void {
    this.syncItems.set(item.id, item);
  }

  /**
   * 🎯 Sync prioritario per dati critici
   */
  public async prioritySync(types?: SyncItem['type'][]): Promise<void> {
    if (!navigator.onLine || this.isSyncing) {
      return;
    }

    console.log('⚡ Starting priority sync...');
    this.isSyncing = true;
    
    const itemsToSync = Array.from(this.syncItems.values())
      .filter(item => !types || types.includes(item.type))
      .filter(item => this.shouldSync(item))
      .sort((a, b) => this.priorityWeights[a.priority] - this.priorityWeights[b.priority]);

    for (const item of itemsToSync) {
      await this.syncItem(item);
      // Pausa tra sync per non sovraccaricare
      await this.delay(this.getNetworkDelay());
    }

    this.isSyncing = false;
    console.log('✅ Priority sync completed');
  }

  /**
   * 🔄 Sync singolo item
   */
  private async syncItem(item: SyncItem): Promise<boolean> {
    item.status = 'SYNCING';
    const startTime = Date.now();

    try {
      console.log(`🔄 Syncing ${item.type}...`);

      // Strategia cache specifica
      const strategy = cacheStrategies.getStrategy(item.type.toLowerCase());
      
      // Check se possiamo usare cache
      if (strategy && await this.canUseCachedData(item, strategy)) {
        console.log(`💾 Using cached data for ${item.type}`);
        item.status = 'SUCCESS';
        return true;
      }

      // Sync con network
      const response = await this.fetchWithRetry(item);
      
      if (response.ok) {
        const data = await response.json();
        
        // Verifica conflitti
        const hasConflict = await this.checkForConflicts(item, data);
        if (hasConflict) {
          item.status = 'CONFLICT';
          await this.handleDataConflict(item, data);
          return false;
        }

        // Store in cache
        if (strategy) {
          await smartCache.set(
            `${item.type.toLowerCase()}_data`,
            data,
            strategy.ttl
          );
        }

        item.data = data;
        item.lastSync = Date.now();
        item.retryCount = 0;
        item.status = 'SUCCESS';

        this.updateSyncMetrics(item.type, Date.now() - startTime, true);
        console.log(`✅ Synced ${item.type} successfully`);
        return true;

      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error(`❌ Failed to sync ${item.type}:`, error);
      item.retryCount++;
      item.status = 'ERROR';
      this.updateSyncMetrics(item.type, Date.now() - startTime, false);
      return false;
    }
  }

  /**
   * 🌐 Fetch con retry intelligente
   */
  private async fetchWithRetry(item: SyncItem, retries: number = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeout = this.getTimeoutForPriority(item.priority);
        
        setTimeout(() => controller.abort(), timeout);

        const response = await fetch(item.endpoint, {
          signal: controller.signal,
          headers: {
            'X-Sync-Request': 'true',
            'X-Sync-Priority': item.priority,
            'X-Last-Sync': item.lastSync.toString(),
            'X-Network-Type': this.networkInfo?.effectiveType || 'unknown'
          }
        });

        return response;

      } catch (error) {
        if (i === retries - 1) throw error;
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        await this.delay(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * 🕐 Timeout basato su priorità
   */
  private getTimeoutForPriority(priority: SyncItem['priority']): number {
    const baseTimeout = this.networkInfo?.saveData ? 15000 : 10000;
    
    switch (priority) {
      case 'CRITICAL': return baseTimeout * 2;
      case 'HIGH': return baseTimeout * 1.5;
      case 'MEDIUM': return baseTimeout;
      case 'LOW': return baseTimeout * 0.5;
      default: return baseTimeout;
    }
  }

  /**
   * 💾 Verifica se può usare dati cached
   */
  private async canUseCachedData(item: SyncItem, strategy: any): Promise<boolean> {
    const cacheKey = `${item.type.toLowerCase()}_data`;
    const cached = await smartCache.get(cacheKey);
    
    if (!cached) return false;

    // Verifica freshness basata su network e priorità
    const maxAge = this.getMaxAgeForItem(item);
    const age = Date.now() - cached.timestamp;

    return age < maxAge;
  }

  /**
   * ⏰ Max age basato su network e priorità
   */
  private getMaxAgeForItem(item: SyncItem): number {
    const baseAge = item.frequency * 60 * 1000; // Convert to ms
    
    // Adjust based on network
    if (this.networkInfo?.saveData) {
      return baseAge * 2; // Extend cache on save-data
    }

    if (this.networkInfo?.effectiveType === 'slow-2g') {
      return baseAge * 3;
    }

    if (this.networkInfo?.effectiveType === '2g') {
      return baseAge * 2;
    }

    return baseAge;
  }

  /**
   * 🔍 Verifica conflitti di dati
   */
  private async checkForConflicts(item: SyncItem, newData: any): Promise<boolean> {
    const cacheKey = `${item.type.toLowerCase()}_data`;
    const cached = await smartCache.get(cacheKey);
    
    if (!cached?.data) return false;

    // Logica specifica per tipo di dato
    switch (item.type) {
      case 'VOTING':
        return this.checkVotingConflicts(cached.data, newData);
      case 'STATS':
        return this.checkStatsConflicts(cached.data, newData);
      case 'PLAYERS':
        return this.checkPlayersConflicts(cached.data, newData);
      default:
        return false;
    }
  }

  /**
   * 🗳️ Verifica conflitti votazioni
   */
  private checkVotingConflicts(cached: any, newData: any): boolean {
    if (!cached.votes || !newData.votes) return false;
    
    // Cerca voti con timestamp diversi per stesso match/player
    const cachedVoteMap = new Map();
    cached.votes.forEach((vote: any) => {
      const key = `${vote.matchId}_${vote.toPlayerId}_${vote.voterEmail}`;
      cachedVoteMap.set(key, vote.timestamp);
    });

    for (const vote of newData.votes) {
      const key = `${vote.matchId}_${vote.toPlayerId}_${vote.voterEmail}`;
      const cachedTimestamp = cachedVoteMap.get(key);
      
      if (cachedTimestamp && cachedTimestamp !== vote.timestamp) {
        return true; // Conflict detected
      }
    }

    return false;
  }

  /**
   * 📊 Verifica conflitti statistiche
   */
  private checkStatsConflicts(cached: any, newData: any): boolean {
    if (!Array.isArray(cached) || !Array.isArray(newData)) return false;
    
    // Check per discrepanze significative in stats critiche
    const tolerance = 0.1; // 10% tolerance
    
    for (const newStat of newData) {
      const cachedStat = cached.find((s: any) => s.email === newStat.email);
      if (cachedStat) {
        const fields = ['gol', 'assistenze', 'partiteVinte'];
        for (const field of fields) {
          const diff = Math.abs(cachedStat[field] - newStat[field]);
          if (diff > cachedStat[field] * tolerance) {
            return true; // Significant difference
          }
        }
      }
    }

    return false;
  }

  /**
   * 👥 Verifica conflitti giocatori
   */
  private checkPlayersConflicts(cached: any, newData: any): boolean {
    if (!Array.isArray(cached) || !Array.isArray(newData)) return false;
    
    // Check per overall rating changes significativi
    for (const newPlayer of newData) {
      const cachedPlayer = cached.find((p: any) => p.email === newPlayer.email);
      if (cachedPlayer) {
        const overallDiff = Math.abs(cachedPlayer.overall - newPlayer.overall);
        if (overallDiff > 5) { // 5 points difference is significant
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 🔀 Gestisci conflitto dati
   */
  private async handleDataConflict(item: SyncItem, newData: any): Promise<void> {
    console.warn(`⚠️ Data conflict detected for ${item.type}`);
    
    // Store conflict per risoluzione
    const conflict = {
      id: `conflict_${item.id}_${Date.now()}`,
      type: item.type,
      cachedData: await smartCache.get(`${item.type.toLowerCase()}_data`),
      newData,
      timestamp: Date.now(),
      status: 'PENDING'
    };

    const conflicts = JSON.parse(localStorage.getItem('calcettinho_data_conflicts') || '[]');
    conflicts.push(conflict);
    localStorage.setItem('calcettinho_data_conflicts', JSON.stringify(conflicts));

    // Trigger evento per UI
    window.dispatchEvent(new CustomEvent('data-conflict', { detail: conflict }));
  }

  /**
   * 📈 Aggiorna metriche sync
   */
  private updateSyncMetrics(type: string, duration: number, success: boolean): void {
    const current = this.getSyncMetrics();
    
    const updated: SyncMetrics = {
      ...current,
      totalSyncs: current.totalSyncs + 1,
      successfulSyncs: current.successfulSyncs + (success ? 1 : 0),
      failedSyncs: current.failedSyncs + (success ? 0 : 1),
      avgSyncTime: (current.avgSyncTime * current.totalSyncs + duration) / (current.totalSyncs + 1),
      lastFullSync: success ? Date.now() : current.lastFullSync,
      dataFreshness: {
        ...current.dataFreshness,
        [type]: success ? Date.now() : current.dataFreshness[type]
      }
    };

    localStorage.setItem(this.metricsKey, JSON.stringify(updated));
    this.notifyListeners(updated);
  }

  /**
   * 🎛️ Adatta strategia sync al network
   */
  private adjustSyncStrategy(): void {
    if (!this.networkInfo) return;

    const { effectiveType, saveData } = this.networkInfo;
    
    // Adatta frequenze in base al network
    const networkMultipliers = {
      'slow-2g': 3,
      '2g': 2,
      '3g': 1.5,
      '4g': 1,
      'unknown': 1.5
    };

    const multiplier = saveData ? 4 : (networkMultipliers[effectiveType as keyof typeof networkMultipliers] || 1.5);

    this.syncItems.forEach(item => {
      const baseFreq = this.getBaseFrequency(item.type);
      item.frequency = Math.round(baseFreq * multiplier);
    });

    console.log(`📶 Adjusted sync strategy for ${effectiveType} network (saveData: ${saveData})`);
  }

  /**
   * ⏰ Frequenza base per tipo
   */
  private getBaseFrequency(type: SyncItem['type']): number {
    switch (type) {
      case 'VOTING': return 5;
      case 'STATS': return 15;
      case 'MATCHES': return 10;
      case 'PLAYERS': return 30;
      case 'PROFILES': return 60;
      default: return 30;
    }
  }

  /**
   * ⏰ Scheduler sync automatico
   */
  private startSyncScheduler(): void {
    setInterval(() => {
      if (!navigator.onLine || this.isSyncing) return;

      const itemsNeedingSync = Array.from(this.syncItems.values())
        .filter(item => this.shouldSync(item));

      if (itemsNeedingSync.length > 0) {
        console.log(`⏰ Scheduled sync needed for ${itemsNeedingSync.length} items`);
        this.prioritySync();
      }
    }, 60000); // Check ogni minuto
  }

  /**
   * 🤔 Verifica se item ha bisogno di sync
   */
  private shouldSync(item: SyncItem): boolean {
    const now = Date.now();
    const timeSinceLastSync = now - item.lastSync;
    const syncInterval = item.frequency * 60 * 1000; // Convert to ms

    return timeSinceLastSync >= syncInterval || item.status === 'ERROR';
  }

  /**
   * ⏱️ Delay basato su network
   */
  private getNetworkDelay(): number {
    if (!this.networkInfo) return 500;
    
    const baseDelay = this.networkInfo.saveData ? 1000 : 500;
    const rttMultiplier = Math.min(this.networkInfo.rtt / 100, 3);
    
    return Math.round(baseDelay * rttMultiplier);
  }

  // Public API
  public async forceSyncType(type: SyncItem['type']): Promise<void> {
    await this.prioritySync([type]);
  }

  public getSyncMetrics(): SyncMetrics {
    const stored = localStorage.getItem(this.metricsKey);
    const defaultMetrics: SyncMetrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      conflictsSyncs: 0,
      avgSyncTime: 0,
      lastFullSync: 0,
      dataFreshness: {},
      networkOptimization: {
        bandwidthSaved: 0,
        requestsAvoided: 0,
        cacheHitRate: 0
      }
    };

    return stored ? { ...defaultMetrics, ...JSON.parse(stored) } : defaultMetrics;
  }

  public addSyncListener(callback: (metrics: SyncMetrics) => void): () => void {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }

  private notifyListeners(metrics: SyncMetrics): void {
    this.syncListeners.forEach(callback => callback(metrics));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Getters
  public get syncStatus(): boolean { return this.isSyncing; }
  public get networkStatus(): NetworkInfo | null { return this.networkInfo; }
}

// Export singleton instance
export const dataSyncManager = new DataSyncManager();
export type { SyncItem, SyncMetrics, NetworkInfo }; 