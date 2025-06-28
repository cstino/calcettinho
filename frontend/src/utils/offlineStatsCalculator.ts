// 🎯 FASE 4.1: ADVANCED OFFLINE FEATURES - Offline Stats Calculator
// Calcola statistiche complete offline con analytics e ranking

import { OfflineMatch, OfflinePlayer, MatchStatus } from './offlineMatchManager';
import { SmartCache } from './smartCache';

// 📊 Interfacce per statistiche offline
export interface PlayerStats {
  email: string;
  name: string;
  
  // Basic Stats
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  winRate: number;
  
  // Scoring Stats
  totalGoals: number;
  totalAssists: number;
  goalsPerMatch: number;
  assistsPerMatch: number;
  
  // Voting Stats
  averageRating: number;
  totalVotes: number;
  ratingHistory: RatingEntry[];
  
  // Performance Stats
  motmCount: number;
  yellowCards: number;
  redCards: number;
  
  // Advanced Analytics
  form: FormData;
  streaks: StreakData;
  positionStats: PositionStats[];
  partnershipStats: PartnershipStat[];
  
  lastUpdated: string;
}

export interface RatingEntry {
  matchId: string;
  matchDate: string;
  rating: number;
  votes: number;
  position?: string;
}

export interface FormData {
  last5Matches: MatchFormEntry[];
  trend: 'improving' | 'declining' | 'stable';
  currentStreak: number;
  streakType: 'wins' | 'losses' | 'draws' | 'goals' | 'clean_sheets';
}

export interface MatchFormEntry {
  matchId: string;
  date: string;
  result: 'win' | 'loss' | 'draw';
  goals: number;
  assists: number;
  rating?: number;
  motm: boolean;
}

export interface StreakData {
  currentWinStreak: number;
  longestWinStreak: number;
  currentGoalStreak: number;
  longestGoalStreak: number;
  currentCleanSheetStreak: number;
  longestCleanSheetStreak: number;
}

export interface PositionStats {
  position: string;
  matchesPlayed: number;
  averageRating: number;
  goals: number;
  assists: number;
  winRate: number;
}

export interface PartnershipStat {
  partnerEmail: string;
  partnerName: string;
  matchesTogether: number;
  winRate: number;
  combinedGoals: number;
  combinedAssists: number;
  averageCombinedRating: number;
}

export interface TeamStats {
  teamName: string;
  
  // Match Results
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  
  // Scoring
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  averageGoalsPerMatch: number;
  
  // Clean Sheets
  cleanSheets: number;
  cleanSheetRate: number;
  
  // Players
  players: PlayerContribution[];
  topScorer?: PlayerContribution;
  topAssister?: PlayerContribution;
  mostValuablePlayer?: PlayerContribution;
}

export interface PlayerContribution {
  email: string;
  name: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
  averageRating: number;
  contributions: number; // goals + assists
}

export interface LeaderboardEntry {
  rank: number;
  email: string;
  name: string;
  value: number;
  category: string;
  trend?: 'up' | 'down' | 'same';
  previousRank?: number;
}

export interface GlobalStats {
  totalMatches: number;
  totalGoals: number;
  totalPlayers: number;
  averageGoalsPerMatch: number;
  averageMatchRating: number;
  
  // Leaderboards
  topScorers: LeaderboardEntry[];
  topAssisters: LeaderboardEntry[];
  topRated: LeaderboardEntry[];
  mostActiveI: LeaderboardEntry[];
  bestWinRate: LeaderboardEntry[];
  
  // Trends
  monthlyStats: MonthlyStatsEntry[];
  recentActivity: ActivityEntry[];
  
  lastCalculated: string;
}

export interface MonthlyStatsEntry {
  month: string; // YYYY-MM
  matches: number;
  goals: number;
  players: number;
  averageRating: number;
}

export interface ActivityEntry {
  date: string;
  type: 'match_completed' | 'goals_scored' | 'votes_submitted';
  description: string;
  players: string[];
}

// 📱 OfflineStatsCalculator - Calcolo statistiche complete offline
export class OfflineStatsCalculator {
  private static instance: OfflineStatsCalculator;
  private cache: SmartCache;
  private playerStatsCache = new Map<string, PlayerStats>();
  private globalStatsCache?: GlobalStats;
  private isInitialized = false;

  // 🔧 Cache configuration
  private static readonly CACHE_KEYS = {
    PLAYER_STATS: 'offline_player_stats',
    GLOBAL_STATS: 'offline_global_stats',
    LEADERBOARDS: 'offline_leaderboards'
  };

  private static readonly CACHE_TTL = {
    PLAYER_STATS: 6 * 60 * 60 * 1000, // 6 hours
    GLOBAL_STATS: 12 * 60 * 60 * 1000, // 12 hours
    LEADERBOARDS: 3 * 60 * 60 * 1000   // 3 hours
  };

  private constructor() {
    this.cache = SmartCache.getInstance();
  }

  static getInstance(): OfflineStatsCalculator {
    if (!this.instance) {
      this.instance = new OfflineStatsCalculator();
    }
    return this.instance;
  }

  // 🚀 Inizializzazione
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 [OfflineStatsCalculator] Initializing...');

      // Carica stats dalla cache
      await this.loadFromCache();

      this.isInitialized = true;
      console.log('✅ [OfflineStatsCalculator] Initialized successfully');

    } catch (error) {
      console.error('❌ [OfflineStatsCalculator] Initialization error:', error);
      throw error;
    }
  }

  // 📊 Calcola statistiche complete da matches
  async calculateAllStats(matches: OfflineMatch[]): Promise<void> {
    await this.ensureInitialized();

    console.log(`📊 [OfflineStatsCalculator] Calculating stats for ${matches.length} matches`);

    // Reset cache
    this.playerStatsCache.clear();
    this.globalStatsCache = undefined;

    // Filtra solo match completate
    const completedMatches = matches.filter(m => m.status === MatchStatus.COMPLETED);

    if (completedMatches.length === 0) {
      console.log('📊 [OfflineStatsCalculator] No completed matches found');
      return;
    }

    // Raccoglie tutti i giocatori
    const allPlayers = this.getAllPlayers(completedMatches);

    // Calcola stats per ogni giocatore
    for (const player of allPlayers) {
      const playerStats = await this.calculatePlayerStats(player.email, player.name, completedMatches);
      this.playerStatsCache.set(player.email, playerStats);
    }

    // Calcola statistiche globali
    this.globalStatsCache = await this.calculateGlobalStats(completedMatches);

    // Salva in cache
    await this.saveToCache();

    console.log('✅ [OfflineStatsCalculator] Stats calculation completed');
  }

  // 👤 Calcola statistiche singolo giocatore
  async calculatePlayerStats(email: string, name: string, matches: OfflineMatch[]): Promise<PlayerStats> {
    const playerMatches = matches.filter(match => 
      match.teamA.players.some(p => p.email === email) ||
      match.teamB.players.some(p => p.email === email)
    );

    if (playerMatches.length === 0) {
      return this.createEmptyPlayerStats(email, name);
    }

    let totalGoals = 0;
    let totalAssists = 0;
    let totalVotes = 0;
    let totalRating = 0;
    let matchesWon = 0;
    let matchesLost = 0;
    let matchesDrawn = 0;
    let motmCount = 0;
    let yellowCards = 0;
    let redCards = 0;

    const ratingHistory: RatingEntry[] = [];
    const formMatches: MatchFormEntry[] = [];
    const positionCounts = new Map<string, { count: number; goals: number; assists: number; totalRating: number; wins: number }>();
    const partnershipCounts = new Map<string, { name: string; matches: number; wins: number; goals: number; assists: number; totalRating: number }>();

    // Elabora ogni match
    for (const match of playerMatches.sort((a, b) => a.date.localeCompare(b.date))) {
      const playerTeam = match.teamA.players.some(p => p.email === email) ? 'A' : 'B';
      const player = (playerTeam === 'A' ? match.teamA : match.teamB).players.find(p => p.email === email);
      const opponentTeam = playerTeam === 'A' ? match.teamB : match.teamA;
      
      if (!player || !match.result) continue;

      // Basic match stats
      const teamScore = playerTeam === 'A' ? match.result.teamAScore : match.result.teamBScore;
      const opponentScore = playerTeam === 'A' ? match.result.teamBScore : match.result.teamAScore;
      
      let matchResult: 'win' | 'loss' | 'draw';
      if (teamScore > opponentScore) {
        matchResult = 'win';
        matchesWon++;
      } else if (teamScore < opponentScore) {
        matchResult = 'loss';
        matchesLost++;
      } else {
        matchResult = 'draw';
        matchesDrawn++;
      }

      // Goals e assists
      const playerGoals = player.stats?.goals || 0;
      const playerAssists = player.stats?.assists || 0;
      totalGoals += playerGoals;
      totalAssists += playerAssists;

      // Cards
      yellowCards += player.stats?.yellowCards || 0;
      redCards += player.stats?.redCards || 0;

      // MOTM
      if (match.result.motm === email) {
        motmCount++;
      }

      // Voting stats
      if (player.stats?.votes && player.stats.votes.length > 0) {
        const matchRating = player.stats.votes.reduce((sum, v) => sum + v.rating, 0) / player.stats.votes.length;
        totalRating += matchRating;
        totalVotes += player.stats.votes.length;

        ratingHistory.push({
          matchId: match.id,
          matchDate: match.date,
          rating: matchRating,
          votes: player.stats.votes.length,
          position: player.position
        });
      }

      // Form data
      formMatches.push({
        matchId: match.id,
        date: match.date,
        result: matchResult,
        goals: playerGoals,
        assists: playerAssists,
        rating: player.stats?.votes && player.stats.votes.length > 0 ? 
          player.stats.votes.reduce((sum, v) => sum + v.rating, 0) / player.stats.votes.length : undefined,
        motm: match.result.motm === email
      });

      // Position stats
      if (player.position) {
        if (!positionCounts.has(player.position)) {
          positionCounts.set(player.position, { count: 0, goals: 0, assists: 0, totalRating: 0, wins: 0 });
        }
        const posStats = positionCounts.get(player.position)!;
        posStats.count++;
        posStats.goals += playerGoals;
        posStats.assists += playerAssists;
        if (player.stats?.votes && player.stats.votes.length > 0) {
          posStats.totalRating += player.stats.votes.reduce((sum, v) => sum + v.rating, 0) / player.stats.votes.length;
        }
        if (matchResult === 'win') posStats.wins++;
      }

      // Partnership stats
      const teammates = (playerTeam === 'A' ? match.teamA : match.teamB).players.filter(p => p.email !== email);
      teammates.forEach(teammate => {
        if (!partnershipCounts.has(teammate.email)) {
          partnershipCounts.set(teammate.email, {
            name: teammate.name,
            matches: 0,
            wins: 0,
            goals: 0,
            assists: 0,
            totalRating: 0
          });
        }
        const partStats = partnershipCounts.get(teammate.email)!;
        partStats.matches++;
        partStats.goals += playerGoals + (teammate.stats?.goals || 0);
        partStats.assists += playerAssists + (teammate.stats?.assists || 0);
        if (matchResult === 'win') partStats.wins++;
        
        const combinedRating = 
          (player.stats?.votes?.reduce((sum, v) => sum + v.rating, 0) || 0) / (player.stats?.votes?.length || 1) +
          (teammate.stats?.votes?.reduce((sum, v) => sum + v.rating, 0) || 0) / (teammate.stats?.votes?.length || 1);
        partStats.totalRating += combinedRating;
      });
    }

    // Calcola statistiche derivate
    const matchesPlayed = playerMatches.length;
    const winRate = matchesPlayed > 0 ? (matchesWon / matchesPlayed) * 100 : 0;
    const goalsPerMatch = matchesPlayed > 0 ? totalGoals / matchesPlayed : 0;
    const assistsPerMatch = matchesPlayed > 0 ? totalAssists / matchesPlayed : 0;
    const averageRating = totalVotes > 0 ? totalRating / (totalVotes / playerMatches.length) : 0;

    // Position stats
    const positionStats: PositionStats[] = Array.from(positionCounts.entries()).map(([position, stats]) => ({
      position,
      matchesPlayed: stats.count,
      averageRating: stats.count > 0 ? stats.totalRating / stats.count : 0,
      goals: stats.goals,
      assists: stats.assists,
      winRate: stats.count > 0 ? (stats.wins / stats.count) * 100 : 0
    }));

    // Partnership stats (top 10)
    const partnershipStats: PartnershipStat[] = Array.from(partnershipCounts.entries())
      .map(([email, stats]) => ({
        partnerEmail: email,
        partnerName: stats.name,
        matchesTogether: stats.matches,
        winRate: stats.matches > 0 ? (stats.wins / stats.matches) * 100 : 0,
        combinedGoals: stats.goals,
        combinedAssists: stats.assists,
        averageCombinedRating: stats.matches > 0 ? stats.totalRating / stats.matches : 0
      }))
      .sort((a, b) => b.matchesTogether - a.matchesTogether)
      .slice(0, 10);

    // Form analysis
    const last5 = formMatches.slice(-5);
    const form: FormData = {
      last5Matches: last5,
      trend: this.calculateTrend(last5),
      currentStreak: this.calculateCurrentStreak(formMatches),
      streakType: this.getStreakType(formMatches)
    };

    // Streak data
    const streaks = this.calculateStreaks(formMatches);

    return {
      email,
      name,
      matchesPlayed,
      matchesWon,
      matchesLost,
      matchesDrawn,
      winRate,
      totalGoals,
      totalAssists,
      goalsPerMatch,
      assistsPerMatch,
      averageRating,
      totalVotes,
      ratingHistory: ratingHistory.slice(-20), // Keep last 20
      motmCount,
      yellowCards,
      redCards,
      form,
      streaks,
      positionStats,
      partnershipStats,
      lastUpdated: new Date().toISOString()
    };
  }

  // 🌍 Calcola statistiche globali
  async calculateGlobalStats(matches: OfflineMatch[]): Promise<GlobalStats> {
    const allPlayers = this.getAllPlayers(matches);
    let totalGoals = 0;
    let totalRatings = 0;
    let ratingCount = 0;

    // Aggrega statistiche
    matches.forEach(match => {
      if (match.result) {
        totalGoals += match.result.goals.length;
        
        [...match.teamA.players, ...match.teamB.players].forEach(player => {
          if (player.stats?.votes) {
            const avgRating = player.stats.votes.reduce((sum, v) => sum + v.rating, 0) / player.stats.votes.length;
            totalRatings += avgRating;
            ratingCount++;
          }
        });
      }
    });

    // Crea leaderboards
    const playerStats = Array.from(this.playerStatsCache.values());
    
    const topScorers = this.createLeaderboard(playerStats, 'totalGoals', 'goals');
    const topAssisters = this.createLeaderboard(playerStats, 'totalAssists', 'assists');
    const topRated = this.createLeaderboard(playerStats, 'averageRating', 'rating');
    const mostActive = this.createLeaderboard(playerStats, 'matchesPlayed', 'matches');
    const bestWinRate = this.createLeaderboard(
      playerStats.filter(p => p.matchesPlayed >= 5), 
      'winRate', 
      'winrate'
    );

    // Monthly stats
    const monthlyStats = this.calculateMonthlyStats(matches);

    // Recent activity
    const recentActivity = this.calculateRecentActivity(matches);

    return {
      totalMatches: matches.length,
      totalGoals,
      totalPlayers: allPlayers.length,
      averageGoalsPerMatch: matches.length > 0 ? totalGoals / matches.length : 0,
      averageMatchRating: ratingCount > 0 ? totalRatings / ratingCount : 0,
      topScorers,
      topAssisters,
      topRated,
      mostActiveI: mostActive,
      bestWinRate,
      monthlyStats,
      recentActivity,
      lastCalculated: new Date().toISOString()
    };
  }

  // 📋 API pubbliche per accesso stats
  async getPlayerStats(email: string): Promise<PlayerStats | null> {
    await this.ensureInitialized();
    return this.playerStatsCache.get(email) || null;
  }

  async getAllPlayerStats(): Promise<PlayerStats[]> {
    await this.ensureInitialized();
    return Array.from(this.playerStatsCache.values());
  }

  async getGlobalStats(): Promise<GlobalStats | null> {
    await this.ensureInitialized();
    return this.globalStatsCache || null;
  }

  async getLeaderboard(category: 'goals' | 'assists' | 'rating' | 'matches' | 'winrate', limit = 10): Promise<LeaderboardEntry[]> {
    const globalStats = await this.getGlobalStats();
    if (!globalStats) return [];

    switch (category) {
      case 'goals': return globalStats.topScorers.slice(0, limit);
      case 'assists': return globalStats.topAssisters.slice(0, limit);
      case 'rating': return globalStats.topRated.slice(0, limit);
      case 'matches': return globalStats.mostActiveI.slice(0, limit);
      case 'winrate': return globalStats.bestWinRate.slice(0, limit);
      default: return [];
    }
  }

  // 🛠️ Utility methods
  private createEmptyPlayerStats(email: string, name: string): PlayerStats {
    return {
      email,
      name,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      matchesDrawn: 0,
      winRate: 0,
      totalGoals: 0,
      totalAssists: 0,
      goalsPerMatch: 0,
      assistsPerMatch: 0,
      averageRating: 0,
      totalVotes: 0,
      ratingHistory: [],
      motmCount: 0,
      yellowCards: 0,
      redCards: 0,
      form: {
        last5Matches: [],
        trend: 'stable',
        currentStreak: 0,
        streakType: 'wins'
      },
      streaks: {
        currentWinStreak: 0,
        longestWinStreak: 0,
        currentGoalStreak: 0,
        longestGoalStreak: 0,
        currentCleanSheetStreak: 0,
        longestCleanSheetStreak: 0
      },
      positionStats: [],
      partnershipStats: [],
      lastUpdated: new Date().toISOString()
    };
  }

  private getAllPlayers(matches: OfflineMatch[]): Array<{ email: string; name: string }> {
    const playersMap = new Map<string, string>();

    matches.forEach(match => {
      [...match.teamA.players, ...match.teamB.players].forEach(player => {
        playersMap.set(player.email, player.name);
      });
    });

    return Array.from(playersMap.entries()).map(([email, name]) => ({ email, name }));
  }

  private createLeaderboard(players: PlayerStats[], field: keyof PlayerStats, category: string): LeaderboardEntry[] {
    return players
      .filter(p => typeof p[field] === 'number' && (p[field] as number) > 0)
      .sort((a, b) => (b[field] as number) - (a[field] as number))
      .slice(0, 20)
      .map((player, index) => ({
        rank: index + 1,
        email: player.email,
        name: player.name,
        value: player[field] as number,
        category
      }));
  }

  private calculateTrend(last5: MatchFormEntry[]): 'improving' | 'declining' | 'stable' {
    if (last5.length < 3) return 'stable';

    const recent = last5.slice(-3);
    const earlier = last5.slice(0, Math.min(3, last5.length - 3));

    const recentWinRate = recent.filter(m => m.result === 'win').length / recent.length;
    const earlierWinRate = earlier.length > 0 ? earlier.filter(m => m.result === 'win').length / earlier.length : 0;

    if (recentWinRate > earlierWinRate + 0.2) return 'improving';
    if (recentWinRate < earlierWinRate - 0.2) return 'declining';
    return 'stable';
  }

  private calculateCurrentStreak(matches: MatchFormEntry[]): number {
    if (matches.length === 0) return 0;

    const lastMatch = matches[matches.length - 1];
    let streak = 1;

    for (let i = matches.length - 2; i >= 0; i--) {
      if (matches[i].result === lastMatch.result) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private getStreakType(matches: MatchFormEntry[]): StreakData['streakType'] {
    if (matches.length === 0) return 'wins';
    return matches[matches.length - 1].result === 'win' ? 'wins' : 
           matches[matches.length - 1].result === 'loss' ? 'losses' : 'draws';
  }

  private calculateStreaks(matches: MatchFormEntry[]): StreakData {
    let currentWinStreak = 0;
    let longestWinStreak = 0;
    let currentGoalStreak = 0;
    let longestGoalStreak = 0;
    let tempWinStreak = 0;
    let tempGoalStreak = 0;

    matches.forEach(match => {
      // Win streaks
      if (match.result === 'win') {
        tempWinStreak++;
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
      } else {
        tempWinStreak = 0;
      }

      // Goal streaks
      if (match.goals > 0) {
        tempGoalStreak++;
        longestGoalStreak = Math.max(longestGoalStreak, tempGoalStreak);
      } else {
        tempGoalStreak = 0;
      }
    });

    // Current streaks
    for (let i = matches.length - 1; i >= 0; i--) {
      if (matches[i].result === 'win') {
        currentWinStreak++;
      } else {
        break;
      }
    }

    for (let i = matches.length - 1; i >= 0; i--) {
      if (matches[i].goals > 0) {
        currentGoalStreak++;
      } else {
        break;
      }
    }

    return {
      currentWinStreak,
      longestWinStreak,
      currentGoalStreak,
      longestGoalStreak,
      currentCleanSheetStreak: 0, // TODO: Implement
      longestCleanSheetStreak: 0   // TODO: Implement
    };
  }

  private calculateMonthlyStats(matches: OfflineMatch[]): MonthlyStatsEntry[] {
    const monthlyMap = new Map<string, { matches: number; goals: number; players: Set<string>; totalRating: number; ratingCount: number }>();

    matches.forEach(match => {
      const month = match.date.substring(0, 7); // YYYY-MM
      
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { matches: 0, goals: 0, players: new Set(), totalRating: 0, ratingCount: 0 });
      }
      
      const monthStats = monthlyMap.get(month)!;
      monthStats.matches++;
      monthStats.goals += match.result?.goals.length || 0;
      
      [...match.teamA.players, ...match.teamB.players].forEach(player => {
        monthStats.players.add(player.email);
        if (player.stats?.votes) {
          const avgRating = player.stats.votes.reduce((sum, v) => sum + v.rating, 0) / player.stats.votes.length;
          monthStats.totalRating += avgRating;
          monthStats.ratingCount++;
        }
      });
    });

    return Array.from(monthlyMap.entries())
      .map(([month, stats]) => ({
        month,
        matches: stats.matches,
        goals: stats.goals,
        players: stats.players.size,
        averageRating: stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : 0
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12); // Last 12 months
  }

  private calculateRecentActivity(matches: OfflineMatch[]): ActivityEntry[] {
    const activities: ActivityEntry[] = [];

    // Recent completed matches
    matches
      .filter(m => m.status === MatchStatus.COMPLETED)
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
      .slice(0, 10)
      .forEach(match => {
        activities.push({
          date: match.modifiedAt,
          type: 'match_completed',
          description: `${match.name} completata`,
          players: [...match.teamA.players, ...match.teamB.players].map(p => p.email)
        });
      });

    return activities.sort((a, b) => b.date.localeCompare(a.date));
  }

  // 💾 Cache management
  private async loadFromCache(): Promise<void> {
    try {
      // Player stats
      const cachedPlayerStats = await this.cache.get(OfflineStatsCalculator.CACHE_KEYS.PLAYER_STATS);
      if (cachedPlayerStats && Array.isArray(cachedPlayerStats)) {
        cachedPlayerStats.forEach((stats: PlayerStats) => {
          this.playerStatsCache.set(stats.email, stats);
        });
      }

      // Global stats
      const cachedGlobalStats = await this.cache.get(OfflineStatsCalculator.CACHE_KEYS.GLOBAL_STATS);
      if (cachedGlobalStats) {
        this.globalStatsCache = cachedGlobalStats;
      }

      console.log(`📂 [OfflineStatsCalculator] Loaded stats from cache`);
    } catch (error) {
      console.warn('⚠️ [OfflineStatsCalculator] Failed to load from cache:', error);
    }
  }

  private async saveToCache(): Promise<void> {
    try {
      // Player stats
      const playerStatsArray = Array.from(this.playerStatsCache.values());
      await this.cache.set(
        OfflineStatsCalculator.CACHE_KEYS.PLAYER_STATS,
        playerStatsArray,
        { ttl: OfflineStatsCalculator.CACHE_TTL.PLAYER_STATS }
      );

      // Global stats
      if (this.globalStatsCache) {
        await this.cache.set(
          OfflineStatsCalculator.CACHE_KEYS.GLOBAL_STATS,
          this.globalStatsCache,
          { ttl: OfflineStatsCalculator.CACHE_TTL.GLOBAL_STATS }
        );
      }

      console.log('💾 [OfflineStatsCalculator] Saved stats to cache');
    } catch (error) {
      console.warn('⚠️ [OfflineStatsCalculator] Failed to save to cache:', error);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // 🧹 Cleanup
  clearCache(): void {
    this.playerStatsCache.clear();
    this.globalStatsCache = undefined;
    console.log('🧹 [OfflineStatsCalculator] Cache cleared');
  }
} 