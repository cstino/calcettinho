/**
 * Smart Cache Manager per Calcettinho
 * Sistema avanzato di caching con IndexedDB, compressione e invalidazione intelligente
 */

import { 
  CACHE_STRATEGIES, 
  getCacheStrategy, 
  getStorageLimit, 
  isMatchDay,
  type CacheStrategy,
  type CacheInvalidationEvent 
} from './cacheStrategies';

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  strategy: string;
  compressed: boolean;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  totalSize: number;
  totalEntries: number;
  hitRate: number;
  missRate: number;
  oldestEntry: number;
  newestEntry: number;
}

class SmartCacheManager {
  private dbName = 'calcettinho-cache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private eventListeners: Map<CacheInvalidationEvent, Function[]> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    writes: 0,
    evictions: 0
  };

  constructor() {
    this.initDB();
    this.setupEventListeners();
  }

  /**
   * Inizializza IndexedDB
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('SmartCache: IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store principale per i dati
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('strategy', 'strategy', { unique: false });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        // Store per metadati e statistiche
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Setup event listeners per invalidazione cache
   */
  private setupEventListeners(): void {
    // Ascolta eventi personalizzati per invalidazione cache
    if (typeof window !== 'undefined') {
      window.addEventListener('cache-invalidate', (event: any) => {
        this.handleCacheInvalidation(event.detail.event, event.detail.pattern);
      });
    }
  }

  /**
   * Ottiene dati dalla cache
   */
  async get<T>(key: string, resourceType: string): Promise<T | null> {
    if (!this.db) await this.initDB();

    try {
      const transaction = this.db!.createTransaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      const entry: CacheEntry = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!entry) {
        this.stats.misses++;
        return null;
      }

      // Verifica scadenza
      if (Date.now() > entry.expiresAt) {
        await this.delete(key);
        this.stats.misses++;
        return null;
      }

      // Aggiorna statistiche di accesso
      await this.updateAccessStats(key);
      this.stats.hits++;

      // Decomprime se necessario
      let data = entry.data;
      if (entry.compressed) {
        data = await this.decompress(data);
      }

      console.log(`SmartCache: HIT for ${key} (${resourceType})`);
      return data;

    } catch (error) {
      console.error('SmartCache: Error getting from cache:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Salva dati nella cache
   */
  async set(key: string, data: any, resourceType: string): Promise<boolean> {
    if (!this.db) await this.initDB();

    const strategy = getCacheStrategy(resourceType, isMatchDay());
    if (!strategy) {
      console.warn(`SmartCache: No strategy found for ${resourceType}`);
      return false;
    }

    try {
      // Verifica limiti di storage
      const currentSize = await this.getCurrentSize();
      const storageLimit = getStorageLimit();
      
      if (currentSize > storageLimit * 0.9) {
        await this.evictLRU();
      }

      // Comprime dati se necessario
      let processedData = data;
      let compressed = false;
      if (strategy.compression) {
        processedData = await this.compress(data);
        compressed = true;
      }

      const entry: CacheEntry = {
        key,
        data: processedData,
        timestamp: Date.now(),
        expiresAt: Date.now() + (strategy.duration * 1000),
        strategy: resourceType,
        compressed,
        size: this.calculateSize(processedData),
        accessCount: 0,
        lastAccessed: Date.now()
      };

      const transaction = this.db!.createTransaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      await new Promise((resolve, reject) => {
        const request = store.put(entry);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      this.stats.writes++;
      console.log(`SmartCache: SET ${key} (${resourceType}) - expires in ${strategy.duration}s`);
      return true;

    } catch (error) {
      console.error('SmartCache: Error setting cache:', error);
      return false;
    }
  }

  /**
   * Elimina entry dalla cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.db) await this.initDB();

    try {
      const transaction = this.db!.createTransaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      await new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return true;
    } catch (error) {
      console.error('SmartCache: Error deleting from cache:', error);
      return false;
    }
  }

  /**
   * Pulisce tutte le entry scadute
   */
  async cleanup(): Promise<number> {
    if (!this.db) await this.initDB();

    try {
      const transaction = this.db!.createTransaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('expiresAt');
      
      const now = Date.now();
      const range = IDBKeyRange.upperBound(now);
      
      let deletedCount = 0;
      const request = index.openCursor(range);
      
      await new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };
        request.onerror = () => reject(request.error);
      });

      console.log(`SmartCache: Cleaned up ${deletedCount} expired entries`);
      return deletedCount;

    } catch (error) {
      console.error('SmartCache: Error during cleanup:', error);
      return 0;
    }
  }

  /**
   * Invalidazione intelligente basata su eventi
   */
  async invalidate(event: CacheInvalidationEvent, pattern?: string): Promise<number> {
    if (!this.db) await this.initDB();

    let invalidatedCount = 0;

    try {
      const transaction = this.db!.createTransaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      const request = store.openCursor();
      
      await new Promise((resolve, reject) => {
        request.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest).result;
          if (cursor) {
            const entry: CacheEntry = cursor.value;
            const strategy = getCacheStrategy(entry.strategy);
            
            // Verifica se questo evento invalida questa entry
            if (strategy?.invalidateOn?.includes(event)) {
              // Se c'è un pattern, verifica se la key fa match
              if (!pattern || entry.key.includes(pattern)) {
                cursor.delete();
                invalidatedCount++;
              }
            }
            cursor.continue();
          } else {
            resolve(invalidatedCount);
          }
        };
        request.onerror = () => reject(request.error);
      });

      console.log(`SmartCache: Invalidated ${invalidatedCount} entries for event: ${event}`);
      return invalidatedCount;

    } catch (error) {
      console.error('SmartCache: Error during invalidation:', error);
      return 0;
    }
  }

  /**
   * Algoritmo LRU per eviction quando si raggiungono i limiti
   */
  private async evictLRU(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.createTransaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('lastAccessed');
      
      // Prende le 10 entry meno recenti
      const request = index.openCursor();
      let evictedCount = 0;
      const maxEvictions = 10;

      await new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor && evictedCount < maxEvictions) {
            const entry: CacheEntry = cursor.value;
            
            // Non evictare entry critiche recenti
            const strategy = getCacheStrategy(entry.strategy);
            if (strategy?.priority !== 'critical' || 
                Date.now() - entry.lastAccessed > 300000) { // 5 minuti
              cursor.delete();
              evictedCount++;
              this.stats.evictions++;
            }
            cursor.continue();
          } else {
            resolve(evictedCount);
          }
        };
        request.onerror = () => reject(request.error);
      });

      console.log(`SmartCache: Evicted ${evictedCount} LRU entries`);

    } catch (error) {
      console.error('SmartCache: Error during LRU eviction:', error);
    }
  }

  /**
   * Aggiorna statistiche di accesso per entry
   */
  private async updateAccessStats(key: string): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.createTransaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      const getRequest = store.get(key);
      const entry: CacheEntry = await new Promise((resolve, reject) => {
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      });

      if (entry) {
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        
        await new Promise((resolve, reject) => {
          const putRequest = store.put(entry);
          putRequest.onsuccess = () => resolve(putRequest.result);
          putRequest.onerror = () => reject(putRequest.error);
        });
      }
    } catch (error) {
      console.error('SmartCache: Error updating access stats:', error);
    }
  }

  /**
   * Compressione dati (implementazione semplice)
   */
  private async compress(data: any): Promise<string> {
    try {
      const jsonString = JSON.stringify(data);
      // Per ora usiamo una compressione base64 semplice
      // In produzione si potrebbe usare LZ-string o simili
      return btoa(jsonString);
    } catch (error) {
      console.error('SmartCache: Compression error:', error);
      return JSON.stringify(data);
    }
  }

  /**
   * Decompressione dati
   */
  private async decompress(compressedData: string): Promise<any> {
    try {
      const jsonString = atob(compressedData);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('SmartCache: Decompression error:', error);
      return compressedData;
    }
  }

  /**
   * Calcola dimensione approssimativa dei dati
   */
  private calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  /**
   * Ottiene dimensione corrente della cache
   */
  private async getCurrentSize(): Promise<number> {
    if (!this.db) return 0;

    try {
      const transaction = this.db.createTransaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.openCursor();

      let totalSize = 0;
      
      await new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const entry: CacheEntry = cursor.value;
            totalSize += entry.size;
            cursor.continue();
          } else {
            resolve(totalSize);
          }
        };
        request.onerror = () => reject(request.error);
      });

      return totalSize;
    } catch (error) {
      console.error('SmartCache: Error calculating size:', error);
      return 0;
    }
  }

  /**
   * Gestisce eventi di invalidazione cache
   */
  private async handleCacheInvalidation(event: CacheInvalidationEvent, pattern?: string): Promise<void> {
    await this.invalidate(event, pattern);
  }

  /**
   * Ottiene statistiche cache
   */
  async getStats(): Promise<CacheStats> {
    const totalSize = await this.getCurrentSize();
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) * 100;
    
    return {
      totalSize,
      totalEntries: this.stats.hits + this.stats.misses,
      hitRate: isNaN(hitRate) ? 0 : hitRate,
      missRate: 100 - hitRate,
      oldestEntry: Date.now(), // TODO: implement
      newestEntry: Date.now()  // TODO: implement
    };
  }

  /**
   * Prefetch di risorse critiche
   */
  async prefetchCriticalResources(): Promise<void> {
    const criticalResources = Object.keys(CACHE_STRATEGIES).filter(
      resourceType => getCacheStrategy(resourceType)?.prefetch === true
    );

    console.log(`SmartCache: Prefetching ${criticalResources.length} critical resources`);
    
    // TODO: Implementare logica di prefetch per risorse specifiche
    // Questo dovrebbe essere collegato alle API dell'app
  }
}

// Singleton instance
const smartCache = new SmartCacheManager();

// Helper functions per uso facile
export async function cacheGet<T>(key: string, resourceType: string): Promise<T | null> {
  return smartCache.get<T>(key, resourceType);
}

export async function cacheSet(key: string, data: any, resourceType: string): Promise<boolean> {
  return smartCache.set(key, data, resourceType);
}

export async function cacheDelete(key: string): Promise<boolean> {
  return smartCache.delete(key);
}

export async function cacheInvalidate(event: CacheInvalidationEvent, pattern?: string): Promise<number> {
  return smartCache.invalidate(event, pattern);
}

export async function cacheCleanup(): Promise<number> {
  return smartCache.cleanup();
}

export async function getCacheStats(): Promise<CacheStats> {
  return smartCache.getStats();
}

// Event emitter per invalidazione cache
export function emitCacheInvalidation(event: CacheInvalidationEvent, pattern?: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cache-invalidate', {
      detail: { event, pattern }
    }));
  }
}

export default smartCache; 