// 🎯 FASE 4.1: ADVANCED OFFLINE FEATURES - Offline Match Manager
// Gestisce creazione, modifica e sincronizzazione partite offline

import { SmartCache } from './smartCache';
import { OfflineQueue, ActionType, ActionPriority } from './offlineQueue';
import { DataSyncManager } from './dataSyncManager';

// 📊 Interfacce per match offline
export interface OfflineMatch {
  id: string; // Temporary ID per match offline
  serverAirtableId?: string; // ID Airtable quando sincronizzato
  name: string;
  date: string;
  location: string;
  teamA: OfflineTeam;
  teamB: OfflineTeam;
  status: MatchStatus;
  result?: MatchResult;
  createdAt: string;
  modifiedAt: string;
  createdOffline: boolean;
  syncStatus: SyncStatus;
  votingEnabled: boolean;
  votingDeadline?: string;
  metadata: MatchMetadata;
}

export interface OfflineTeam {
  name: string;
  players: OfflinePlayer[];
  captain?: string;
  formation?: string;
  color: string;
}

export interface OfflinePlayer {
  email: string;
  name: string;
  confirmed: boolean;
  joinedAt: string;
  position?: PlayerPosition;
  stats?: PlayerMatchStats;
}

export interface MatchResult {
  teamAScore: number;
  teamBScore: number;
  goals: Goal[];
  duration: number; // in minutes
  motm?: string; // Player email
  finalizedAt: string;
}

export interface Goal {
  id: string;
  playerEmail: string;
  playerName: string;
  minute: number;
  team: 'A' | 'B';
  type: 'goal' | 'own_goal' | 'penalty';
  assistBy?: string;
}

export interface PlayerMatchStats {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  rating?: number;
  votes?: OfflineVote[];
}

export interface OfflineVote {
  voterEmail: string;
  voterName: string;
  rating: number;
  comment?: string;
  submittedAt: string;
}

export interface MatchMetadata {
  weatherConditions?: string;
  fieldConditions?: string;
  referee?: string;
  notes?: string;
  photos?: string[];
}

export enum MatchStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum SyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  CONFLICT = 'conflict',
  ERROR = 'error'
}

export enum PlayerPosition {
  GOALKEEPER = 'goalkeeper',
  DEFENDER = 'defender', 
  MIDFIELDER = 'midfielder',
  FORWARD = 'forward'
}

// 📱 OfflineMatchManager - Gestione completa partite offline
export class OfflineMatchManager {
  private static instance: OfflineMatchManager;
  private cache: SmartCache;
  private offlineQueue: OfflineQueue;
  private syncManager: DataSyncManager;
  private matches = new Map<string, OfflineMatch>();
  private isInitialized = false;

  // 🔧 Cache keys
  private static readonly CACHE_KEYS = {
    MATCHES: 'offline_matches',
    DRAFT_MATCHES: 'draft_matches',
    PENDING_VOTES: 'pending_votes'
  };

  private constructor() {
    this.cache = SmartCache.getInstance();
    this.offlineQueue = OfflineQueue.getInstance();
    this.syncManager = DataSyncManager.getInstance();
  }

  static getInstance(): OfflineMatchManager {
    if (!this.instance) {
      this.instance = new OfflineMatchManager();
    }
    return this.instance;
  }

  // 🚀 Inizializzazione
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 [OfflineMatchManager] Initializing...');

      // Carica matches dalla cache
      await this.loadMatchesFromCache();

      // Setup sync listeners
      this.setupSyncListeners();

      // Clean old draft matches
      await this.cleanOldDraftMatches();

      this.isInitialized = true;
      console.log('✅ [OfflineMatchManager] Initialized successfully');

    } catch (error) {
      console.error('❌ [OfflineMatchManager] Initialization error:', error);
      throw error;
    }
  }

  // 📝 Crea nuova partita offline
  async createMatch(matchData: Partial<OfflineMatch>): Promise<OfflineMatch> {
    await this.ensureInitialized();

    const matchId = this.generateOfflineId();
    const now = new Date().toISOString();

    const newMatch: OfflineMatch = {
      id: matchId,
      name: matchData.name || `Partita ${new Date().toLocaleDateString()}`,
      date: matchData.date || new Date().toISOString(),
      location: matchData.location || 'Campo da definire',
      teamA: matchData.teamA || this.createEmptyTeam('Team A', '#ff6b6b'),
      teamB: matchData.teamB || this.createEmptyTeam('Team B', '#4ecdc4'),
      status: MatchStatus.DRAFT,
      createdAt: now,
      modifiedAt: now,
      createdOffline: true,
      syncStatus: SyncStatus.PENDING,
      votingEnabled: matchData.votingEnabled ?? true,
      metadata: matchData.metadata || {},
      ...matchData
    };

    // Salva in memoria e cache
    this.matches.set(matchId, newMatch);
    await this.saveMatchesToCache();

    // Aggiungi alla queue di sync (bassa priorità per draft)
    await this.offlineQueue.addAction({
      type: ActionType.MATCH_ACTION,
      data: {
        action: 'create',
        match: newMatch
      },
      priority: newMatch.status === MatchStatus.DRAFT ? ActionPriority.LOW : ActionPriority.MEDIUM,
      timestamp: now,
      retryCount: 0
    });

    console.log(`📝 [OfflineMatchManager] Created match: ${matchId}`);
    return newMatch;
  }

  // ✏️ Aggiorna partita esistente
  async updateMatch(matchId: string, updates: Partial<OfflineMatch>): Promise<OfflineMatch | null> {
    await this.ensureInitialized();

    const existingMatch = this.matches.get(matchId);
    if (!existingMatch) {
      console.warn(`⚠️ [OfflineMatchManager] Match not found: ${matchId}`);
      return null;
    }

    const updatedMatch: OfflineMatch = {
      ...existingMatch,
      ...updates,
      modifiedAt: new Date().toISOString(),
      syncStatus: SyncStatus.PENDING // Mark as needing sync
    };

    // Salva aggiornamento
    this.matches.set(matchId, updatedMatch);
    await this.saveMatchesToCache();

    // Aggiungi alla queue di sync
    const priority = this.getUpdatePriority(existingMatch.status, updatedMatch.status);
    await this.offlineQueue.addAction({
      type: ActionType.MATCH_ACTION,
      data: {
        action: 'update',
        matchId,
        updates,
        fullMatch: updatedMatch
      },
      priority,
      timestamp: updatedMatch.modifiedAt,
      retryCount: 0
    });

    console.log(`✏️ [OfflineMatchManager] Updated match: ${matchId}`);
    return updatedMatch;
  }

  // 👥 Gestione giocatori
  async addPlayerToTeam(
    matchId: string, 
    teamType: 'A' | 'B', 
    player: Omit<OfflinePlayer, 'joinedAt' | 'confirmed'>
  ): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match) return false;

    const team = teamType === 'A' ? match.teamA : match.teamB;
    
    // Controlla se giocatore già presente
    if (team.players.some(p => p.email === player.email)) {
      console.warn(`⚠️ [OfflineMatchManager] Player already in team: ${player.email}`);
      return false;
    }

    const newPlayer: OfflinePlayer = {
      ...player,
      joinedAt: new Date().toISOString(),
      confirmed: true,
      stats: {
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        votes: []
      }
    };

    team.players.push(newPlayer);

    await this.updateMatch(matchId, {
      [teamType === 'A' ? 'teamA' : 'teamB']: team
    });

    console.log(`👥 [OfflineMatchManager] Added player ${player.name} to team ${teamType}`);
    return true;
  }

  async removePlayerFromTeam(matchId: string, teamType: 'A' | 'B', playerEmail: string): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match) return false;

    const team = teamType === 'A' ? match.teamA : match.teamB;
    const playerIndex = team.players.findIndex(p => p.email === playerEmail);
    
    if (playerIndex === -1) {
      console.warn(`⚠️ [OfflineMatchManager] Player not found: ${playerEmail}`);
      return false;
    }

    team.players.splice(playerIndex, 1);

    await this.updateMatch(matchId, {
      [teamType === 'A' ? 'teamA' : 'teamB']: team
    });

    console.log(`👥 [OfflineMatchManager] Removed player ${playerEmail} from team ${teamType}`);
    return true;
  }

  // ⚽ Gestione match in corso
  async startMatch(matchId: string): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match || match.status !== MatchStatus.SCHEDULED) {
      return false;
    }

    return !!(await this.updateMatch(matchId, {
      status: MatchStatus.LIVE,
      result: {
        teamAScore: 0,
        teamBScore: 0,
        goals: [],
        duration: 0,
        finalizedAt: ''
      }
    }));
  }

  async addGoal(matchId: string, goal: Omit<Goal, 'id'>): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match || match.status !== MatchStatus.LIVE || !match.result) {
      return false;
    }

    const newGoal: Goal = {
      id: this.generateOfflineId(),
      ...goal
    };

    const updatedResult = {
      ...match.result,
      goals: [...match.result.goals, newGoal],
      teamAScore: goal.team === 'A' && goal.type !== 'own_goal' ? 
        match.result.teamAScore + 1 : match.result.teamAScore,
      teamBScore: goal.team === 'B' && goal.type !== 'own_goal' ? 
        match.result.teamBScore + 1 : match.result.teamBScore
    };

    // Handle own goals
    if (goal.type === 'own_goal') {
      if (goal.team === 'A') {
        updatedResult.teamBScore += 1;
      } else {
        updatedResult.teamAScore += 1;
      }
    }

    // Aggiorna stats giocatore
    const team = goal.team === 'A' ? match.teamA : match.teamB;
    const player = team.players.find(p => p.email === goal.playerEmail);
    if (player && player.stats) {
      if (goal.type !== 'own_goal') {
        player.stats.goals += 1;
      }
    }

    // Aggiorna assist se presente
    if (goal.assistBy) {
      const assistPlayer = team.players.find(p => p.email === goal.assistBy);
      if (assistPlayer && assistPlayer.stats) {
        assistPlayer.stats.assists += 1;
      }
    }

    return !!(await this.updateMatch(matchId, {
      result: updatedResult,
      teamA: goal.team === 'A' ? team : match.teamA,
      teamB: goal.team === 'B' ? team : match.teamB
    }));
  }

  async endMatch(matchId: string, duration: number): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match || match.status !== MatchStatus.LIVE || !match.result) {
      return false;
    }

    const finalResult = {
      ...match.result,
      duration,
      finalizedAt: new Date().toISOString()
    };

    return !!(await this.updateMatch(matchId, {
      status: MatchStatus.COMPLETED,
      result: finalResult
    }));
  }

  // 🗳️ Gestione voting offline
  async submitVote(
    matchId: string, 
    voterEmail: string, 
    voterName: string, 
    votes: Array<{ playerEmail: string; rating: number; comment?: string }>
  ): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match || match.status !== MatchStatus.COMPLETED || !match.votingEnabled) {
      return false;
    }

    const now = new Date().toISOString();
    let updated = false;

    // Aggiorna votes per ogni giocatore
    [...match.teamA.players, ...match.teamB.players].forEach(player => {
      const vote = votes.find(v => v.playerEmail === player.email);
      if (vote && player.stats) {
        // Rimuovi voto esistente se presente
        player.stats.votes = player.stats.votes?.filter(v => v.voterEmail !== voterEmail) || [];
        
        // Aggiungi nuovo voto
        player.stats.votes.push({
          voterEmail,
          voterName,
          rating: vote.rating,
          comment: vote.comment,
          submittedAt: now
        });
        updated = true;
      }
    });

    if (updated) {
      await this.updateMatch(matchId, {
        teamA: match.teamA,
        teamB: match.teamB
      });

      // Aggiungi vote action alla queue
      await this.offlineQueue.addAction({
        type: ActionType.VOTE,
        data: {
          matchId,
          voterEmail,
          voterName,
          votes
        },
        priority: ActionPriority.HIGH,
        timestamp: now,
        retryCount: 0
      });

      console.log(`🗳️ [OfflineMatchManager] Submitted votes for match: ${matchId}`);
      return true;
    }

    return false;
  }

  // 📊 Query e statistiche
  getMatches(filter?: {
    status?: MatchStatus;
    dateFrom?: string;
    dateTo?: string;
    playerEmail?: string;
  }): OfflineMatch[] {
    let matches = Array.from(this.matches.values());

    if (filter) {
      if (filter.status) {
        matches = matches.filter(m => m.status === filter.status);
      }
      
      if (filter.dateFrom) {
        matches = matches.filter(m => m.date >= filter.dateFrom!);
      }
      
      if (filter.dateTo) {
        matches = matches.filter(m => m.date <= filter.dateTo!);
      }
      
      if (filter.playerEmail) {
        matches = matches.filter(m => 
          m.teamA.players.some(p => p.email === filter.playerEmail) ||
          m.teamB.players.some(p => p.email === filter.playerEmail)
        );
      }
    }

    return matches.sort((a, b) => b.date.localeCompare(a.date));
  }

  getMatch(matchId: string): OfflineMatch | undefined {
    return this.matches.get(matchId);
  }

  getPendingSyncMatches(): OfflineMatch[] {
    return Array.from(this.matches.values()).filter(m => 
      m.syncStatus === SyncStatus.PENDING || m.syncStatus === SyncStatus.ERROR
    );
  }

  getMatchStats(matchId: string): {
    totalPlayers: number;
    totalGoals: number;
    topScorer?: { email: string; name: string; goals: number };
    averageRating?: number;
  } | null {
    const match = this.matches.get(matchId);
    if (!match) return null;

    const allPlayers = [...match.teamA.players, ...match.teamB.players];
    const totalGoals = match.result?.goals.length || 0;
    
    let topScorer: { email: string; name: string; goals: number } | undefined;
    let maxGoals = 0;
    let totalRatings = 0;
    let ratingCount = 0;

    allPlayers.forEach(player => {
      if (player.stats) {
        if (player.stats.goals > maxGoals) {
          maxGoals = player.stats.goals;
          topScorer = {
            email: player.email,
            name: player.name,
            goals: player.stats.goals
          };
        }

        if (player.stats.votes) {
          const playerAverage = player.stats.votes.reduce((sum, v) => sum + v.rating, 0) / player.stats.votes.length;
          if (!isNaN(playerAverage)) {
            totalRatings += playerAverage;
            ratingCount++;
          }
        }
      }
    });

    return {
      totalPlayers: allPlayers.length,
      totalGoals,
      topScorer: maxGoals > 0 ? topScorer : undefined,
      averageRating: ratingCount > 0 ? totalRatings / ratingCount : undefined
    };
  }

  // 🔄 Sincronizzazione
  async syncPendingMatches(): Promise<{ success: number; failed: number; }> {
    const pendingMatches = this.getPendingSyncMatches();
    let success = 0;
    let failed = 0;

    console.log(`🔄 [OfflineMatchManager] Syncing ${pendingMatches.length} pending matches`);

    for (const match of pendingMatches) {
      try {
        match.syncStatus = SyncStatus.SYNCING;
        await this.saveMatchesToCache();

        // Sync via API
        const response = await fetch('/api/matches', {
          method: match.serverAirtableId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Offline-Action': match.serverAirtableId ? 'update' : 'create',
            'X-Action-ID': match.id
          },
          body: JSON.stringify(this.prepareMatchForSync(match))
        });

        if (response.ok) {
          const syncedMatch = await response.json();
          match.syncStatus = SyncStatus.SYNCED;
          match.serverAirtableId = syncedMatch.id || match.serverAirtableId;
          success++;
        } else {
          match.syncStatus = SyncStatus.ERROR;
          failed++;
        }

      } catch (error) {
        console.error(`❌ [OfflineMatchManager] Sync failed for match ${match.id}:`, error);
        match.syncStatus = SyncStatus.ERROR;
        failed++;
      }
    }

    await this.saveMatchesToCache();
    console.log(`✅ [OfflineMatchManager] Sync completed: ${success} success, ${failed} failed`);

    return { success, failed };
  }

  // 🧹 Utility methods
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private generateOfflineId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createEmptyTeam(name: string, color: string): OfflineTeam {
    return {
      name,
      players: [],
      color,
      formation: '4-4-2'
    };
  }

  private getUpdatePriority(oldStatus: MatchStatus, newStatus: MatchStatus): ActionPriority {
    if (newStatus === MatchStatus.LIVE || oldStatus === MatchStatus.LIVE) {
      return ActionPriority.HIGH;
    }
    if (newStatus === MatchStatus.COMPLETED) {
      return ActionPriority.MEDIUM;
    }
    return ActionPriority.LOW;
  }

  private async loadMatchesFromCache(): Promise<void> {
    try {
      const cachedMatches = await this.cache.get(OfflineMatchManager.CACHE_KEYS.MATCHES);
      if (cachedMatches && Array.isArray(cachedMatches)) {
        cachedMatches.forEach((match: OfflineMatch) => {
          this.matches.set(match.id, match);
        });
        console.log(`📂 [OfflineMatchManager] Loaded ${cachedMatches.length} matches from cache`);
      }
    } catch (error) {
      console.warn('⚠️ [OfflineMatchManager] Failed to load matches from cache:', error);
    }
  }

  private async saveMatchesToCache(): Promise<void> {
    try {
      const matchesArray = Array.from(this.matches.values());
      await this.cache.set(
        OfflineMatchManager.CACHE_KEYS.MATCHES,
        matchesArray,
        { ttl: 24 * 60 * 60 * 1000 } // 24 hours
      );
    } catch (error) {
      console.warn('⚠️ [OfflineMatchManager] Failed to save matches to cache:', error);
    }
  }

  private async cleanOldDraftMatches(): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const toDelete: string[] = [];
    
    this.matches.forEach((match, id) => {
      if (match.status === MatchStatus.DRAFT && 
          new Date(match.createdAt) < sevenDaysAgo) {
        toDelete.push(id);
      }
    });

    toDelete.forEach(id => this.matches.delete(id));
    
    if (toDelete.length > 0) {
      await this.saveMatchesToCache();
      console.log(`🧹 [OfflineMatchManager] Cleaned ${toDelete.length} old draft matches`);
    }
  }

  private setupSyncListeners(): void {
    // Listen per network status changes
    window.addEventListener('online', () => {
      console.log('🌐 [OfflineMatchManager] Network restored, triggering sync');
      this.syncPendingMatches();
    });
  }

  private prepareMatchForSync(match: OfflineMatch): any {
    // Convert to format expected by server
    return {
      id: match.serverAirtableId,
      name: match.name,
      date: match.date,
      location: match.location,
      team_a_name: match.teamA.name,
      team_a_players: match.teamA.players.map(p => p.email),
      team_b_name: match.teamB.name,
      team_b_players: match.teamB.players.map(p => p.email),
      status: match.status,
      team_a_score: match.result?.teamAScore || 0,
      team_b_score: match.result?.teamBScore || 0,
      goals: match.result?.goals || [],
      voting_enabled: match.votingEnabled,
      voting_deadline: match.votingDeadline,
      created_offline: match.createdOffline,
      offline_id: match.id
    };
  }

  // 🗑️ Cleanup
  async deleteMatch(matchId: string): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match) return false;

    // Non permettere eliminazione di match live o completate con voti
    if (match.status === MatchStatus.LIVE || 
        (match.status === MatchStatus.COMPLETED && this.hasVotes(match))) {
      console.warn(`⚠️ [OfflineMatchManager] Cannot delete match in status: ${match.status}`);
      return false;
    }

    this.matches.delete(matchId);
    await this.saveMatchesToCache();

    // Se match era sincronizzata, aggiungi delete action
    if (match.serverAirtableId) {
      await this.offlineQueue.addAction({
        type: ActionType.MATCH_ACTION,
        data: {
          action: 'delete',
          matchId: match.serverAirtableId
        },
        priority: ActionPriority.LOW,
        timestamp: new Date().toISOString(),
        retryCount: 0
      });
    }

    console.log(`🗑️ [OfflineMatchManager] Deleted match: ${matchId}`);
    return true;
  }

  private hasVotes(match: OfflineMatch): boolean {
    return [...match.teamA.players, ...match.teamB.players].some(
      player => player.stats?.votes && player.stats.votes.length > 0
    );
  }

  // 📊 Stats globali per admin
  getGlobalStats(): {
    totalMatches: number;
    pendingSync: number;
    completedMatches: number;
    totalGoals: number;
    totalPlayers: Set<string>;
  } {
    const matches = Array.from(this.matches.values());
    const totalPlayers = new Set<string>();
    
    let totalGoals = 0;
    
    matches.forEach(match => {
      [...match.teamA.players, ...match.teamB.players].forEach(player => {
        totalPlayers.add(player.email);
      });
      
      totalGoals += match.result?.goals.length || 0;
    });

    return {
      totalMatches: matches.length,
      pendingSync: this.getPendingSyncMatches().length,
      completedMatches: matches.filter(m => m.status === MatchStatus.COMPLETED).length,
      totalGoals,
      totalPlayers
    };
  }
} 