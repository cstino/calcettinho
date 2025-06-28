/**
 * Cache Strategies per Calcettinho - Sport-Specific Optimization
 * Sistema intelligente di caching per massimizzare performance e user experience
 */

export interface CacheStrategy {
  duration: number;           // Durata cache in secondi
  priority: 'critical' | 'high' | 'medium' | 'low';
  maxSize?: number;          // Max numero di entries
  compression?: boolean;     // Compressione dati
  networkTimeout?: number;   // Timeout per network requests
  invalidateOn?: string[];   // Eventi che invalidano la cache
  prefetch?: boolean;        // Prefetch automatico
}

export interface CacheConfig {
  [key: string]: CacheStrategy;
}

// ⚽ Strategie Cache Sport-Specific per Calcettinho
export const CACHE_STRATEGIES: CacheConfig = {
  // 🏆 CRITICAL - Dati essenziali per funzionamento app
  'live-matches': {
    duration: 30,              // 30 secondi - dati live
    priority: 'critical',
    maxSize: 10,
    networkTimeout: 3,
    invalidateOn: ['match-update', 'goal-scored'],
    prefetch: true
  },

  'voting-status': {
    duration: 60,              // 1 minuto - stati voti
    priority: 'critical', 
    maxSize: 50,
    networkTimeout: 5,
    invalidateOn: ['vote-submitted', 'voting-closed']
  },

  // 🎯 HIGH - Dati consultati frequentemente
  'player-profiles': {
    duration: 3600,            // 1 ora - profili giocatori
    priority: 'high',
    maxSize: 100,
    compression: true,
    networkTimeout: 8,
    invalidateOn: ['stats-updated', 'match-completed'],
    prefetch: true
  },

  'match-history': {
    duration: 1800,            // 30 minuti - storico partite
    priority: 'high',
    maxSize: 200,
    compression: true,
    networkTimeout: 10,
    invalidateOn: ['new-match-added', 'match-finalized']
  },

  'stats-leaderboard': {
    duration: 900,             // 15 minuti - classifiche
    priority: 'high',
    maxSize: 50,
    compression: true,
    networkTimeout: 8,
    invalidateOn: ['stats-recalculated', 'season-updated'],
    prefetch: true
  },

  'player-stats': {
    duration: 1800,            // 30 minuti - statistiche individuali
    priority: 'high',
    maxSize: 100,
    compression: true,
    networkTimeout: 10,
    invalidateOn: ['stats-updated', 'achievement-unlocked']
  },

  // 🎴 MEDIUM - Assets e contenuti statici
  'card-images': {
    duration: 86400,           // 24 ore - immagini delle card
    priority: 'medium',
    maxSize: 200,
    compression: false,        // Immagini già ottimizzate
    networkTimeout: 15,
    prefetch: true
  },

  'player-photos': {
    duration: 604800,          // 7 giorni - foto giocatori
    priority: 'medium',
    maxSize: 100,
    compression: false,
    networkTimeout: 20
  },

  'card-templates': {
    duration: 2592000,         // 30 giorni - template card
    priority: 'medium',
    maxSize: 50,
    compression: false,
    networkTimeout: 30
  },

  // 📊 MEDIUM - Dati analytics e ausiliari
  'achievements': {
    duration: 7200,            // 2 ore - achievement e premi
    priority: 'medium',
    maxSize: 100,
    compression: true,
    networkTimeout: 10,
    invalidateOn: ['achievement-unlocked', 'new-season']
  },

  'whitelist': {
    duration: 3600,            // 1 ora - utenti autorizzati
    priority: 'medium',
    maxSize: 200,
    networkTimeout: 5,
    invalidateOn: ['user-added', 'permissions-updated']
  },

  // 🔧 LOW - Dati di configurazione
  'app-config': {
    duration: 86400,           // 24 ore - configurazioni app
    priority: 'low',
    maxSize: 10,
    compression: true,
    networkTimeout: 30
  },

  'special-cards-config': {
    duration: 43200,           // 12 ore - configurazione card speciali
    priority: 'low',
    maxSize: 20,
    compression: true,
    networkTimeout: 15,
    invalidateOn: ['card-config-updated']
  }
};

// 🎮 Strategie specifiche per situazioni Match-Day
export const MATCH_DAY_CACHE_STRATEGIES: CacheConfig = {
  // Durante giorni partita, cache più aggressiva per performance
  'live-matches': {
    ...CACHE_STRATEGIES['live-matches'],
    duration: 15,              // Cache più frequente durante match
    prefetch: true
  },

  'player-profiles': {
    ...CACHE_STRATEGIES['player-profiles'],
    duration: 7200,            // Cache più lunga durante match day
    prefetch: true
  },

  'voting-interfaces': {
    duration: 300,             // 5 minuti - interfacce di voto
    priority: 'critical',
    maxSize: 20,
    prefetch: true,
    networkTimeout: 3
  }
};

// 🏃‍♂️ Cache priorities per resource management
export const CACHE_PRIORITIES = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4
} as const;

// 📱 Storage limits per tipo di device
export const STORAGE_LIMITS = {
  mobile: 50 * 1024 * 1024,   // 50MB per mobile
  desktop: 100 * 1024 * 1024, // 100MB per desktop
  tablet: 75 * 1024 * 1024    // 75MB per tablet
};

// 🔄 Eventi di invalidazione cache
export const CACHE_INVALIDATION_EVENTS = [
  'match-update',
  'goal-scored', 
  'vote-submitted',
  'voting-closed',
  'stats-updated',
  'match-completed',
  'new-match-added',
  'match-finalized',
  'stats-recalculated',
  'season-updated',
  'achievement-unlocked',
  'user-added',
  'permissions-updated',
  'card-config-updated',
  'new-season'
] as const;

export type CacheInvalidationEvent = typeof CACHE_INVALIDATION_EVENTS[number];

/**
 * Ottiene la strategia cache per una risorsa specifica
 */
export function getCacheStrategy(resourceType: string, isMatchDay: boolean = false): CacheStrategy | null {
  const strategies = isMatchDay ? MATCH_DAY_CACHE_STRATEGIES : CACHE_STRATEGIES;
  return strategies[resourceType] || null;
}

/**
 * Verifica se una risorsa deve essere prefetched
 */
export function shouldPrefetch(resourceType: string): boolean {
  const strategy = getCacheStrategy(resourceType);
  return strategy?.prefetch === true;
}

/**
 * Calcola la dimensione massima cache per il dispositivo corrente
 */
export function getStorageLimit(): number {
  if (typeof window === 'undefined') return STORAGE_LIMITS.desktop;
  
      const userAgent = typeof window !== 'undefined' && window.navigator ? window.navigator.userAgent : 'server-side';
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android.*Tablet/i.test(userAgent);
  
  if (isMobile && !isTablet) return STORAGE_LIMITS.mobile;
  if (isTablet) return STORAGE_LIMITS.tablet;
  return STORAGE_LIMITS.desktop;
}

/**
 * Determina se siamo in un giorno partita (per cache strategies ottimizzate)
 */
export function isMatchDay(): boolean {
  // TODO: Implementare logica per rilevare giorni partita
  // Per ora usiamo euristica semplice
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // Assumiamo partite nei weekend (sabato=6, domenica=0)
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export default CACHE_STRATEGIES; 