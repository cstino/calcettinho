# 🎯 ROADMAP RANK SYSTEM v3.0 - Calcettinho

**Data Creazione**: Dicembre 2024  
**Versione Target**: v3.0  
**Durata Stimata**: 12-14 settimane  
**Effort Totale**: ~250 ore sviluppo  

---

## 📋 EXECUTIVE SUMMARY

Trasformazione completa del sistema da **statistics-based** (overall numerico) a **rank-based** (stile League of Legends/Rocket League) con:

- **Sistema MMR**: Algoritmo bilanciato per calcolo rank basato su vittorie (70%) + voti (30%)
- **6 Rank Tiers**: Bronze → Silver → Gold → Platinum → Diamond → Champion (4 divisioni ciascuno)
- **Sistema Emblemi**: 5 categorie progressive integrate nella card principale (sostituiscono card special)
- **SVG Engine**: Rendering dinamico embedded per performance ottimali
- **Placement System**: Prime 5 partite per determinare rank iniziale

---

## 🏗️ ARCHITETTURA SISTEMA ATTUALE

### Database Schema Esistente (Airtable)
```
players: nome, email, Attacco, Difesa, Velocità, Forza, Passaggio, Portiere
player_stats: playerEmail, Gol, Assistenze, partiteVinte, partiteDisputate, etc.
special_cards: template_id, condition_type, condition_field, condition_value
player_awards: playerEmail, awardType, status, unlocked_at
matches: IDmatch, teamA, teamB, scoreA, scoreB, completed, voting_status
votes: matchId, fromPlayerId, toPlayerId, voteType, motm_vote
```

### Sistema Card Attuale
- **Template**: `overall >= 90 ? 'ultimate' : overall >= 78 ? 'oro' : overall >= 65 ? 'argento' : 'bronzo'`
- **Generazione**: PNG dinamico via Canvas API (`backend/src/app/api/card/[email]/route.ts`)
- **Special Cards**: Sistema separato con PNG statici

---

## 🎯 NUOVO SISTEMA TARGET

### MMR Algorithm Specification
```typescript
interface MMRCalculation {
  baseMMR: 1000;
  weights: {
    matchResult: 0.7;    // 70% peso W/L/D
    voteScore: 0.3;      // 30% peso voti (-9 a +9)
  };
  changes: {
    win: +25;           // Base change per vittoria
    loss: -25;          // Base change per sconfitta  
    draw: 0;            // Nessun cambio per pareggio
    voteMultiplier: 2;  // Moltiplicatore voti (netVotes * 2)
  };
  rankBounds: {
    bronze: [0, 999],
    silver: [1000, 1299], 
    gold: [1300, 1599],
    platinum: [1600, 1899],
    diamond: [1900, 2199],
    champion: [2200, Infinity]
  };
}
```

### Emblem System Specification
```typescript
interface EmblemThresholds {
  goleador: { bronze: 10, silver: 20, gold: 30, platinum: 40, diamond: 50, champion: 100 };
  assistman: { bronze: 5, silver: 15, gold: 25, platinum: 35, diamond: 50, champion: 100 };
  motm: { bronze: 5, silver: 10, gold: 20, platinum: 30, diamond: 40, champion: 75 };
  presenze: { bronze: 10, silver: 20, gold: 30, platinum: 40, diamond: 50, champion: 100 };
  vittorie: { bronze: 5, silver: 10, gold: 20, platinum: 30, diamond: 50, champion: 100 };
}
```

---

## 📅 ROADMAP FASI

### 🔧 FASE 1: ANALISI & PROGETTAZIONE (Settimana 1-2)

#### Task 1.1: Database Schema Design
**Owner**: Backend Developer  
**Effort**: 16 ore  
**Deliverable**: Schema completo nuove tabelle Airtable

**Dettaglio**:
```sql
-- Nuova tabella: player_ranks
CREATE TABLE player_ranks (
  playerEmail TEXT PRIMARY KEY,
  currentMMR NUMBER DEFAULT 1000,
  currentRank TEXT DEFAULT 'unranked',
  currentDivision NUMBER DEFAULT 1,
  placementMatchesPlayed NUMBER DEFAULT 0,
  isPlacementComplete BOOLEAN DEFAULT false,
  mmrHistory LONGTEXT, -- JSON array
  seasonId TEXT DEFAULT 'season_1',
  lastMatchDate DATETIME,
  promotionPoints NUMBER DEFAULT 0,
  winStreak NUMBER DEFAULT 0,
  lossStreak NUMBER DEFAULT 0
);

-- Nuova tabella: player_emblems  
CREATE TABLE player_emblems (
  id TEXT PRIMARY KEY,
  playerEmail TEXT,
  emblemType TEXT, -- goleador, assistman, motm, presenze, vittorie
  currentLevel TEXT DEFAULT 'locked',
  progress NUMBER DEFAULT 0,
  unlockedAt DATETIME,
  seasonId TEXT DEFAULT 'season_1'
);

-- Nuova tabella: mmr_transactions
CREATE TABLE mmr_transactions (
  id TEXT PRIMARY KEY,
  playerEmail TEXT,
  matchId TEXT,
  mmrBefore NUMBER,
  mmrAfter NUMBER,
  mmrChange NUMBER,
  reason TEXT, -- 'match_result', 'placement', 'adjustment'
  details LONGTEXT, -- JSON con dettagli calcolo
  createdAt DATETIME
);
```

#### Task 1.2: MMR Algorithm Implementation
**Owner**: Backend Developer  
**Effort**: 24 ore  
**Deliverable**: Engine MMR completo e testato

**File**: `backend/src/utils/mmr-engine.ts`
```typescript
export class MMREngine {
  private static readonly BASE_MMR = 1000;
  private static readonly PLACEMENT_MULTIPLIER = 2;
  
  calculateMMRChange(params: {
    playerCurrentMMR: number;
    matchResult: 'win' | 'loss' | 'draw';
    netVotes: number; // -9 a +9
    opponentAvgMMR: number;
    isPlacementMatch: boolean;
  }): number {
    const baseChange = this.calculateBaseChange(params);
    const voteBonus = params.netVotes * 2;
    const difficultyModifier = this.calculateDifficultyModifier(params);
    const placementMultiplier = params.isPlacementMatch ? 2 : 1;
    
    return Math.round((baseChange + voteBonus + difficultyModifier) * placementMultiplier);
  }
  
  private calculateBaseChange(params: any): number {
    switch (params.matchResult) {
      case 'win': return 25;
      case 'loss': return -25;
      case 'draw': return 0;
      default: return 0;
    }
  }
  
  private calculateDifficultyModifier(params: any): number {
    const mmrDiff = params.opponentAvgMMR - params.playerCurrentMMR;
    return Math.max(-10, Math.min(10, mmrDiff / 100));
  }
  
  getRankFromMMR(mmr: number): { tier: string; division: number } {
    if (mmr >= 2200) return { tier: 'champion', division: Math.min(4, Math.floor((mmr - 2200) / 50) + 1) };
    if (mmr >= 1900) return { tier: 'diamond', division: Math.floor((mmr - 1900) / 75) + 1 };
    if (mmr >= 1600) return { tier: 'platinum', division: Math.floor((mmr - 1600) / 75) + 1 };
    if (mmr >= 1300) return { tier: 'gold', division: Math.floor((mmr - 1300) / 75) + 1 };
    if (mmr >= 1000) return { tier: 'silver', division: Math.floor((mmr - 1000) / 75) + 1 };
    return { tier: 'bronze', division: Math.floor(mmr / 250) + 1 };
  }
}
```

#### Task 1.3: Conversion Logic Design
**Owner**: Backend Developer  
**Effort**: 12 ore  
**Deliverable**: Algoritmo conversione utenti esistenti

**File**: `backend/src/utils/player-conversion.ts`
```typescript
export function convertExistingPlayerToRank(player: ExistingPlayer): RankPlayerData {
  // Formula conversione: overall + experience + winrate
  const baseMMR = Math.max(800, Math.min(1800, player.overall * 15));
  const experienceBonus = Math.min(200, player.matches * 3);
  const winRateBonus = player.winRate > 0.6 ? 150 : player.winRate < 0.4 ? -150 : 0;
  
  const finalMMR = Math.max(500, baseMMR + experienceBonus + winRateBonus);
  const rank = new MMREngine().getRankFromMMR(finalMMR);
  
  return {
    playerEmail: player.email,
    currentMMR: finalMMR,
    currentRank: rank.tier,
    currentDivision: rank.division,
    placementMatchesPlayed: 5, // Skip placement per esistenti
    isPlacementComplete: true,
    mmrHistory: [{ match: 'initial_conversion', mmr: finalMMR, date: new Date().toISOString() }]
  };
}
```

---

### ⚙️ FASE 2: BACKEND IMPLEMENTATION (Settimana 3-6)

#### Task 2.1: Nuove API Routes
**Owner**: Backend Developer  
**Effort**: 32 ore  
**Deliverable**: Sistema API completo per rank system

**Routes da implementare**:

1. **`backend/src/app/api/ranks/[email]/route.ts`**
```typescript
export async function GET(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const { email } = await params;
  const rankData = await getRankDataByEmail(email);
  return NextResponse.json(rankData);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const { email } = await params;
  const updateData = await req.json();
  const updated = await updatePlayerRank(email, updateData);
  return NextResponse.json(updated);
}
```

2. **`backend/src/app/api/ranks/leaderboard/route.ts`**
```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const rank = searchParams.get('rank') || null;
  
  const leaderboard = await getMMRLeaderboard(limit, rank);
  return NextResponse.json(leaderboard);
}
```

3. **`backend/src/app/api/emblems/[email]/route.ts`**
```typescript
export async function GET(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const { email } = await params;
  const emblems = await getPlayerEmblems(email);
  return NextResponse.json(emblems);
}
```

4. **`backend/src/app/api/matches/[id]/process-rank-changes/route.ts`**
```typescript
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params;
  const { voteAggregation } = await req.json();
  
  const mmrChanges = await processMatchRankChanges(matchId, voteAggregation);
  return NextResponse.json(mmrChanges);
}
```

#### Task 2.2: Emblem Progress System
**Owner**: Backend Developer  
**Effort**: 24 ore  
**Deliverable**: Sistema completo gestione emblemi

**File**: `backend/src/utils/emblem-engine.ts`
```typescript
export class EmblemEngine {
  private static readonly THRESHOLDS = {
    goleador: { bronze: 10, silver: 20, gold: 30, platinum: 40, diamond: 50, champion: 100 },
    assistman: { bronze: 5, silver: 15, gold: 25, platinum: 35, diamond: 50, champion: 100 },
    motm: { bronze: 5, silver: 10, gold: 20, platinum: 30, diamond: 40, champion: 75 },
    presenze: { bronze: 10, silver: 20, gold: 30, platinum: 40, diamond: 50, champion: 100 },
    vittorie: { bronze: 5, silver: 10, gold: 20, platinum: 30, diamond: 50, champion: 100 }
  };
  
  async updatePlayerEmblems(playerEmail: string, stats: PlayerStats): Promise<EmblemUpdate[]> {
    const updates: EmblemUpdate[] = [];
    
    for (const [emblemType, thresholds] of Object.entries(this.THRESHOLDS)) {
      const currentProgress = this.getStatValue(stats, emblemType);
      const currentLevel = await this.getCurrentEmblemLevel(playerEmail, emblemType);
      const newLevel = this.calculateEmblemLevel(currentProgress, thresholds);
      
      if (newLevel !== currentLevel) {
        await this.updateEmblem(playerEmail, emblemType, newLevel, currentProgress);
        updates.push({ emblemType, from: currentLevel, to: newLevel, progress: currentProgress });
      }
    }
    
    return updates;
  }
  
  private calculateEmblemLevel(progress: number, thresholds: any): string {
    if (progress >= thresholds.champion) return 'champion';
    if (progress >= thresholds.diamond) return 'diamond';
    if (progress >= thresholds.platinum) return 'platinum';
    if (progress >= thresholds.gold) return 'gold';
    if (progress >= thresholds.silver) return 'silver';
    if (progress >= thresholds.bronze) return 'bronze';
    return 'locked';
  }
}
```

#### Task 2.3: Integration con Match Finalization
**Owner**: Backend Developer  
**Effort**: 16 ore  
**Deliverable**: Integrazione seamless con sistema votazioni esistente

**Modifica**: `backend/src/app/api/matches/[id]/finalize-voting/route.ts`
```typescript
// Aggiungere dopo aggiornamento statistiche esistenti:
console.log('🏆 PHASE 4: Aggiornamento sistema rank...');

for (const playerEmail of allPlayers) {
  const playerTeam = teamA.includes(playerEmail) ? 'A' : 'B';
  const matchResult = isDraw ? 'draw' : 
    (playerTeam === 'A' && teamAWins) || (playerTeam === 'B' && !teamAWins) ? 'win' : 'loss';
  
  const netVotes = voteStats[playerEmail]?.net || 0;
  const opponentAvgMMR = await calculateOpponentAvgMMR(playerEmail, allPlayers);
  
  // Calcola cambio MMR
  const mmrChange = await mmrEngine.calculateMMRChange({
    playerCurrentMMR: currentPlayerMMR,
    matchResult,
    netVotes,
    opponentAvgMMR,
    isPlacementMatch: await isInPlacement(playerEmail)
  });
  
  // Aggiorna rank
  await updatePlayerMMR(playerEmail, mmrChange, matchId);
  
  // Aggiorna emblemi
  await emblemEngine.updatePlayerEmblems(playerEmail, updatedStats);
}
```

---

### 🎨 FASE 3: SVG CARD SYSTEM (Settimana 7-9)

#### Task 3.1: SVG Template Engine
**Owner**: Frontend Developer  
**Effort**: 32 ore  
**Deliverable**: Sistema completo rendering SVG dinamico

**File**: `frontend/src/components/svg/RankCardSVG.tsx`
```typescript
interface RankCardProps {
  player: Player;
  rank: string;
  division: number;
  mmr: number;
  emblems: EmblemData[];
}

export const RankCardSVG: React.FC<RankCardProps> = ({ player, rank, division, mmr, emblems }) => {
  const gradients = getRankGradients(rank);
  const emblemPositions = getEmblemPositions(emblems.length);
  
  return (
    <svg width="600" height="864" viewBox="0 0 600 864" className="rank-card">
      <defs>
        <linearGradient id={`rank-${rank}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gradients.start} />
          <stop offset="100%" stopColor={gradients.end} />
        </linearGradient>
        {emblems.map(emblem => (
          <EmblemGradient key={emblem.type} emblem={emblem} />
        ))}
      </defs>
      
      {/* Background */}
      <rect width="600" height="864" fill={`url(#rank-${rank})`} />
      
      {/* Player Photo */}
      <clipPath id="playerPhoto">
        <circle cx="300" cy="200" r="80" />
      </clipPath>
      <image 
        href={player.photoUrl} 
        x="220" y="120" 
        width="160" height="160" 
        clipPath="url(#playerPhoto)" 
      />
      
      {/* Rank Badge */}
      <RankBadgeSVG rank={rank} division={division} x="300" y="320" />
      
      {/* Player Name */}
      <text x="300" y="380" textAnchor="middle" className="player-name" fill="white">
        {player.name}
      </text>
      
      {/* MMR Display */}
      <text x="300" y="420" textAnchor="middle" className="mmr-display" fill="white">
        {mmr} MMR
      </text>
      
      {/* Emblems Grid */}
      <g className="emblems-container">
        {emblems.map((emblem, index) => (
          <EmblemSVG 
            key={emblem.type}
            emblem={emblem}
            x={emblemPositions[index].x}
            y={emblemPositions[index].y}
          />
        ))}
      </g>
    </svg>
  );
};
```

#### Task 3.2: Emblem SVG Components
**Owner**: Frontend Developer  
**Effort**: 24 ore  
**Deliverable**: 5 componenti SVG per ogni tipo emblem

**File**: `frontend/src/components/svg/emblems/EmblemSVG.tsx`
```typescript
const EMBLEM_ICONS = {
  goleador: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  assistman: "M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z",
  motm: "M12 15.39l-3.76 2.27.99-4.28-3.32-2.88 4.38-.38L12 6.09l1.71 4.03 4.38.38-3.32 2.88.99 4.28z",
  presenze: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z",
  vittorie: "M9 11H7v3h2v-3zm4 0h-2v3h2v-3zm4 0h-2v3h2v-3zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"
};

const LEVEL_COLORS = {
  locked: '#4A5568',
  bronze: '#CD7F32',
  silver: '#C0C0C0', 
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  champion: '#FF6B6B'
};

export const EmblemSVG: React.FC<EmblemProps> = ({ emblem, x, y, size = 60 }) => {
  const isActive = emblem.level !== 'locked';
  const color = LEVEL_COLORS[emblem.level];
  const iconPath = EMBLEM_ICONS[emblem.type];
  
  return (
    <g transform={`translate(${x - size/2}, ${y - size/2})`} className={`emblem ${isActive ? 'active' : 'locked'}`}>
      {/* Background Circle */}
      <circle 
        cx={size/2} 
        cy={size/2} 
        r={size/2 - 2} 
        fill={color}
        stroke={isActive ? '#FFFFFF' : '#666666'}
        strokeWidth="2"
        opacity={isActive ? 1 : 0.3}
      />
      
      {/* Icon */}
      <g transform={`translate(${size/2 - 12}, ${size/2 - 12})`}>
        <path 
          d={iconPath} 
          fill={isActive ? '#FFFFFF' : '#999999'} 
          transform="scale(1)" 
        />
      </g>
      
      {/* Level Indicator */}
      {isActive && emblem.level !== 'locked' && (
        <text 
          x={size/2} 
          y={size - 5} 
          textAnchor="middle" 
          className="emblem-level" 
          fill="white" 
          fontSize="10"
        >
          {emblem.level.toUpperCase()}
        </text>
      )}
    </g>
  );
};
```

#### Task 3.3: Backend SVG Generation API
**Owner**: Backend Developer  
**Effort**: 16 ore  
**Deliverable**: API endpoint per generazione SVG server-side

**File**: `backend/src/app/api/card-svg/[email]/route.ts`
```typescript
export async function GET(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const { email } = await params;
  
  // Recupera dati player
  const playerData = await getPlayerByEmail(email);
  const rankData = await getRankDataByEmail(email);
  const emblems = await getPlayerEmblems(email);
  
  if (!playerData || !rankData) {
    return new NextResponse('Player not found', { status: 404 });
  }
  
  // Genera SVG string
  const svgContent = generateRankCardSVG({
    player: playerData,
    rank: rankData.currentRank,
    division: rankData.currentDivision,
    mmr: rankData.currentMMR,
    emblems: emblems
  });
  
  return new NextResponse(svgContent, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300', // 5 minuti cache
    },
  });
}

function generateRankCardSVG(data: RankCardData): string {
  const gradients = getRankGradients(data.rank);
  const emblemPositions = getEmblemPositions(data.emblems.length);
  
  return `
    <svg width="600" height="864" viewBox="0 0 600 864" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rank-${data.rank}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${gradients.start}" />
          <stop offset="100%" stop-color="${gradients.end}" />
        </linearGradient>
      </defs>
      
      <rect width="600" height="864" fill="url(#rank-${data.rank})" />
      
      <!-- Player Photo -->
      <clipPath id="playerPhoto">
        <circle cx="300" cy="200" r="80" />
      </clipPath>
      <image href="${data.player.photoUrl}" x="220" y="120" width="160" height="160" clip-path="url(#playerPhoto)" />
      
      <!-- Rank Badge -->
      ${generateRankBadgeSVG(data.rank, data.division, 300, 320)}
      
      <!-- Player Name -->
      <text x="300" y="380" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24" font-weight="bold">
        ${data.player.name}
      </text>
      
      <!-- MMR -->
      <text x="300" y="420" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18">
        ${data.mmr} MMR
      </text>
      
      <!-- Emblems -->
      ${data.emblems.map((emblem, index) => 
        generateEmblemSVG(emblem, emblemPositions[index].x, emblemPositions[index].y)
      ).join('')}
    </svg>
  `;
}
```

---

### 🖥️ FASE 4: FRONTEND REDESIGN (Settimana 10-12)

#### Task 4.1: Rank Display Components
**Owner**: Frontend Developer  
**Effort**: 28 ore  
**Deliverable**: Componenti UI completi per visualizzazione rank

**File**: `frontend/src/components/rank/RankBadge.tsx`
```typescript
interface RankBadgeProps {
  rank: string;
  division: number;
  mmr: number;
  size?: 'small' | 'medium' | 'large';
  showMMR?: boolean;
}

export const RankBadge: React.FC<RankBadgeProps> = ({ 
  rank, 
  division, 
  mmr, 
  size = 'medium', 
  showMMR = true 
}) => {
  const sizeClasses = {
    small: 'w-16 h-16 text-xs',
    medium: 'w-24 h-24 text-sm',
    large: 'w-32 h-32 text-base'
  };
  
  const rankColors = {
    bronze: 'from-amber-700 to-amber-900',
    silver: 'from-gray-400 to-gray-600', 
    gold: 'from-yellow-400 to-yellow-600',
    platinum: 'from-cyan-300 to-cyan-500',
    diamond: 'from-blue-400 to-blue-600',
    champion: 'from-purple-500 to-pink-500'
  };
  
  return (
    <div className={`rank-badge ${sizeClasses[size]} relative`}>
      {/* Background Gradient */}
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${rankColors[rank]} opacity-90`} />
      
      {/* Rank Icon */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
        <RankIcon rank={rank} className="w-1/2 h-1/2" />
        <span className="font-bold">{division}</span>
      </div>
      
      {/* MMR Display */}
      {showMMR && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-center">
          <span className="text-xs text-gray-400">{mmr} MMR</span>
        </div>
      )}
      
      {/* Rank Name */}
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-center">
        <span className="text-xs font-semibold text-gray-300 capitalize">{rank}</span>
      </div>
    </div>
  );
};
```

#### Task 4.2: Player Profile Redesign
**Owner**: Frontend Developer  
**Effort**: 32 ore  
**Deliverable**: Pagina profilo completamente ridisegnata per sistema rank

**Modifica**: `frontend/src/app/profile/[email]/page.tsx`
```typescript
// Sostituire logica card type con rank system
const PlayerProfileContent = () => {
  const [rankData, setRankData] = useState<RankData | null>(null);
  const [emblems, setEmblems] = useState<EmblemData[]>([]);
  const [mmrHistory, setMMRHistory] = useState<MMRPoint[]>([]);
  
  useEffect(() => {
    const fetchRankData = async () => {
      try {
        const [rankResponse, emblemResponse] = await Promise.all([
          fetch(`/api/ranks/${email}`),
          fetch(`/api/emblems/${email}`)
        ]);
        
        if (rankResponse.ok) {
          const rankData = await rankResponse.json();
          setRankData(rankData);
          setMMRHistory(rankData.mmrHistory || []);
        }
        
        if (emblemResponse.ok) {
          const emblemData = await emblemResponse.json();
          setEmblems(emblemData);
        }
      } catch (error) {
        console.error('Error fetching rank data:', error);
      }
    };
    
    if (email) fetchRankData();
  }, [email]);
  
  return (
    <div className="profile-container">
      {/* Header con Rank Badge */}
      <div className="profile-header">
        <div className="rank-display">
          <RankBadge 
            rank={rankData?.currentRank || 'unranked'}
            division={rankData?.currentDivision || 1}
            mmr={rankData?.currentMMR || 1000}
            size="large"
          />
        </div>
        
        {/* Player Card SVG */}
        <div className="player-card">
          <RankCardSVG 
            player={player}
            rank={rankData?.currentRank || 'unranked'}
            division={rankData?.currentDivision || 1}
            mmr={rankData?.currentMMR || 1000}
            emblems={emblems}
          />
        </div>
      </div>
      
      {/* MMR History Chart */}
      <div className="mmr-section">
        <h3>Progressione MMR</h3>
        <MMRChart history={mmrHistory} currentMMR={rankData?.currentMMR || 1000} />
      </div>
      
      {/* Emblems Section */}
      <div className="emblems-section">
        <h3>Emblemi Sbloccati</h3>
        <EmblemGrid emblems={emblems} />
      </div>
      
      {/* Placement Progress */}
      {rankData && !rankData.isPlacementComplete && (
        <div className="placement-section">
          <h3>Partite Placement</h3>
          <PlacementProgress 
            played={rankData.placementMatchesPlayed}
            total={5}
          />
        </div>
      )}
    </div>
  );
};
```

#### Task 4.3: Leaderboard Redesign
**Owner**: Frontend Developer  
**Effort**: 20 ore  
**Deliverable**: Classifica basata su MMR con filtri per rank

**Modifica**: `frontend/src/app/stats/page.tsx`
```typescript
const StatsPage = () => {
  const [leaderboard, setLeaderboard] = useState<RankPlayer[]>([]);
  const [selectedRank, setSelectedRank] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedRank !== 'all') params.set('rank', selectedRank);
        params.set('limit', '100');
        
        const response = await fetch(`/api/ranks/leaderboard?${params}`);
        if (response.ok) {
          const data = await response.json();
          setLeaderboard(data);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [selectedRank]);
  
  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1>Classifica MMR</h1>
        
        {/* Rank Filter */}
        <div className="rank-filter">
          <select 
            value={selectedRank} 
            onChange={(e) => setSelectedRank(e.target.value)}
            className="rank-select"
          >
            <option value="all">Tutti i Rank</option>
            <option value="champion">Champion</option>
            <option value="diamond">Diamond</option>
            <option value="platinum">Platinum</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="bronze">Bronze</option>
          </select>
        </div>
      </div>
      
      {/* Leaderboard Table */}
      <div className="leaderboard-container">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Posizione</th>
                <th>Giocatore</th>
                <th>Rank</th>
                <th>MMR</th>
                <th>W/L</th>
                <th>Emblemi</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((player, index) => (
                <tr key={player.playerEmail} className="leaderboard-row">
                  <td className="position">#{index + 1}</td>
                  <td className="player-info">
                    <img src={player.photoUrl} alt={player.name} className="player-avatar" />
                    <span>{player.name}</span>
                  </td>
                  <td className="rank-info">
                    <RankBadge 
                      rank={player.currentRank}
                      division={player.currentDivision}
                      mmr={player.currentMMR}
                      size="small"
                      showMMR={false}
                    />
                  </td>
                  <td className="mmr">{player.currentMMR}</td>
                  <td className="winloss">{player.wins}W / {player.losses}L</td>
                  <td className="emblems">
                    <EmblemMiniGrid emblems={player.emblems} maxShow={3} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
```

---

### 🔄 FASE 5: DATA MIGRATION (Settimana 13)

#### Task 5.1: Migration Script
**Owner**: Backend Developer  
**Effort**: 24 ore  
**Deliverable**: Script completo migrazione dati esistenti

**File**: `scripts/migrate-to-rank-system.js`
```javascript
const Airtable = require('airtable');
const { MMREngine } = require('../backend/src/utils/mmr-engine');
const { EmblemEngine } = require('../backend/src/utils/emblem-engine');

class RankSystemMigration {
  constructor() {
    this.base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
    this.mmrEngine = new MMREngine();
    this.emblemEngine = new EmblemEngine();
  }
  
  async migrateAllPlayers() {
    console.log('🚀 Iniziando migrazione al sistema rank...');
    
    // 1. Recupera tutti i giocatori esistenti
    const players = await this.getAllExistingPlayers();
    console.log(`📊 Trovati ${players.length} giocatori da migrare`);
    
    // 2. Migra ogni giocatore
    const results = { success: 0, errors: 0 };
    
    for (const player of players) {
      try {
        await this.migratePlayer(player);
        results.success++;
        console.log(`✅ Migrato: ${player.name} (${player.email})`);
      } catch (error) {
        results.errors++;
        console.error(`❌ Errore migrazione ${player.email}:`, error);
      }
    }
    
    console.log(`📋 Migrazione completata: ${results.success} successi, ${results.errors} errori`);
    return results;
  }
  
  async migratePlayer(player) {
    // Calcola MMR iniziale da overall esistente
    const initialMMR = this.calculateInitialMMR(player);
    const rank = this.mmrEngine.getRankFromMMR(initialMMR);
    
    // Crea record player_ranks
    await this.base('player_ranks').create({
      playerEmail: player.email,
      currentMMR: initialMMR,
      currentRank: rank.tier,
      currentDivision: rank.division,
      placementMatchesPlayed: 5, // Skip placement per esistenti
      isPlacementComplete: true,
      mmrHistory: JSON.stringify([{
        match: 'initial_migration',
        mmr: initialMMR,
        change: 0,
        reason: 'Migrazione da sistema overall',
        date: new Date().toISOString()
      }]),
      seasonId: 'season_1',
      lastMatchDate: new Date().toISOString()
    });
    
    // Migra achievements a emblemi
    await this.migratePlayerEmblems(player);
  }
  
  calculateInitialMMR(player) {
    // Formula: overall base + experience bonus + winrate bonus
    const stats = [player.ATT, player.DIF, player.VEL, player.FOR, player.PAS, player.POR];
    const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
    const overall = top5Stats.reduce((a, b) => a + b, 0) / 5;
    
    const baseMMR = Math.max(800, Math.min(1800, overall * 15));
    const experienceBonus = Math.min(200, player.matches * 3);
    const winRate = player.matches > 0 ? player.wins / player.matches : 0.5;
    const winRateBonus = winRate > 0.6 ? 150 : winRate < 0.4 ? -150 : 0;
    
    return Math.max(500, Math.round(baseMMR + experienceBonus + winRateBonus));
  }
  
  async migratePlayerEmblems(player) {
    const stats = await this.getPlayerStats(player.email);
    const emblems = [];
    
    // Goleador emblem
    const goleadorLevel = this.emblemEngine.calculateEmblemLevel(stats.gol, this.emblemEngine.THRESHOLDS.goleador);
    if (goleadorLevel !== 'locked') {
      emblems.push({
        playerEmail: player.email,
        emblemType: 'goleador',
        currentLevel: goleadorLevel,
        progress: stats.gol,
        unlockedAt: new Date().toISOString(),
        seasonId: 'season_1'
      });
    }
    
    // Assistman emblem
    const assistmanLevel = this.emblemEngine.calculateEmblemLevel(stats.assistenze, this.emblemEngine.THRESHOLDS.assistman);
    if (assistmanLevel !== 'locked') {
      emblems.push({
        playerEmail: player.email,
        emblemType: 'assistman',
        currentLevel: assistmanLevel,
        progress: stats.assistenze,
        unlockedAt: new Date().toISOString(),
        seasonId: 'season_1'
      });
    }
    
    // MOTM emblem (da player_awards esistenti)
    const motmCount = await this.getPlayerMOTMCount(player.email);
    const motmLevel = this.emblemEngine.calculateEmblemLevel(motmCount, this.emblemEngine.THRESHOLDS.motm);
    if (motmLevel !== 'locked') {
      emblems.push({
        playerEmail: player.email,
        emblemType: 'motm',
        currentLevel: motmLevel,
        progress: motmCount,
        unlockedAt: new Date().toISOString(),
        seasonId: 'season_1'
      });
    }
    
    // Presenze emblem
    const presenzeLevel = this.emblemEngine.calculateEmblemLevel(stats.partiteDisputate, this.emblemEngine.THRESHOLDS.presenze);
    if (presenzeLevel !== 'locked') {
      emblems.push({
        playerEmail: player.email,
        emblemType: 'presenze',
        currentLevel: presenzeLevel,
        progress: stats.partiteDisputate,
        unlockedAt: new Date().toISOString(),
        seasonId: 'season_1'
      });
    }
    
    // Vittorie emblem
    const vittorieLevel = this.emblemEngine.calculateEmblemLevel(stats.partiteVinte, this.emblemEngine.THRESHOLDS.vittorie);
    if (vittorieLevel !== 'locked') {
      emblems.push({
        playerEmail: player.email,
        emblemType: 'vittorie',
        currentLevel: vittorieLevel,
        progress: stats.partiteVinte,
        unlockedAt: new Date().toISOString(),
        seasonId: 'season_1'
      });
    }
    
    // Inserisci emblemi in batch
    if (emblems.length > 0) {
      await this.base('player_emblems').create(emblems);
    }
  }
  
  async getAllExistingPlayers() {
    return await this.base('players').select().all().then(records => 
      records.map(record => ({
        id: record.id,
        name: record.get('name'),
        email: record.get('email'),
        ATT: Number(record.get('Attacco')) || 50,
        DIF: Number(record.get('Difesa')) || 50,
        VEL: Number(record.get('Velocità')) || 50,
        FOR: Number(record.get('Forza')) || 50,
        PAS: Number(record.get('Passaggio')) || 50,
        POR: Number(record.get('Portiere')) || 50
      }))
    );
  }
  
  async getPlayerStats(email) {
    const records = await this.base('player_stats').select({
      filterByFormula: `{playerEmail} = "${email}"`
    }).all();
    
    if (records.length === 0) return { gol: 0, assistenze: 0, partiteDisputate: 0, partiteVinte: 0 };
    
    const record = records[0];
    return {
      gol: Number(record.get('Gol')) || 0,
      assistenze: Number(record.get('Assistenze')) || 0,
      partiteDisputate: Number(record.get('partiteDisputate')) || 0,
      partiteVinte: Number(record.get('partiteVinte')) || 0
    };
  }
  
  async getPlayerMOTMCount(email) {
    const records = await this.base('player_awards').select({
      filterByFormula: `AND({playerEmail} = "${email}", {awardType} = "motm")`
    }).all();
    
    return records.length;
  }
}

// Esecuzione script
if (require.main === module) {
  const migration = new RankSystemMigration();
  migration.migrateAllPlayers()
    .then(results => {
      console.log('✅ Migrazione completata con successo:', results);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Errore durante migrazione:', error);
      process.exit(1);
    });
}

module.exports = { RankSystemMigration };
```

#### Task 5.2: Rollback Strategy
**Owner**: Backend Developer  
**Effort**: 8 ore  
**Deliverable**: Sistema rollback in caso di problemi

**File**: `scripts/rollback-rank-system.js`
```javascript
class RankSystemRollback {
  async rollbackMigration() {
    console.log('⏪ Iniziando rollback sistema rank...');
    
    // 1. Backup dati rank prima di cancellare
    await this.backupRankData();
    
    // 2. Cancella tabelle rank system
    await this.clearTable('player_ranks');
    await this.clearTable('player_emblems');
    await this.clearTable('mmr_transactions');
    
    // 3. Ripristina sistema precedente se necessario
    await this.restoreOldSystem();
    
    console.log('✅ Rollback completato');
  }
  
  async backupRankData() {
    const tables = ['player_ranks', 'player_emblems', 'mmr_transactions'];
    const backup = {};
    
    for (const table of tables) {
      backup[table] = await this.base(table).select().all();
    }
    
    // Salva backup su file
    require('fs').writeFileSync(
      `backup_rank_system_${Date.now()}.json`, 
      JSON.stringify(backup, null, 2)
    );
  }
}
```

---

### ✅ FASE 6: TESTING & DEPLOYMENT (Settimana 14)

#### Task 6.1: MMR Algorithm Testing
**Owner**: QA Engineer  
**Effort**: 16 ore  
**Deliverable**: Suite test completa per algoritmo MMR

**File**: `tests/mmr-algorithm.test.ts`
```typescript
describe('MMR Algorithm', () => {
  let mmrEngine: MMREngine;
  
  beforeEach(() => {
    mmrEngine = new MMREngine();
  });
  
  describe('Basic MMR Changes', () => {
    test('should award MMR for wins', () => {
      const change = mmrEngine.calculateMMRChange({
        playerCurrentMMR: 1000,
        matchResult: 'win',
        netVotes: 0,
        opponentAvgMMR: 1000,
        isPlacementMatch: false
      });
      
      expect(change).toBeGreaterThan(0);
      expect(change).toBe(25); // Base win reward
    });
    
    test('should subtract MMR for losses', () => {
      const change = mmrEngine.calculateMMRChange({
        playerCurrentMMR: 1000,
        matchResult: 'loss',
        netVotes: 0,
        opponentAvgMMR: 1000,
        isPlacementMatch: false
      });
      
      expect(change).toBeLessThan(0);
      expect(change).toBe(-25); // Base loss penalty
    });
    
    test('should not change MMR for draws', () => {
      const change = mmrEngine.calculateMMRChange({
        playerCurrentMMR: 1000,
        matchResult: 'draw',
        netVotes: 0,
        opponentAvgMMR: 1000,
        isPlacementMatch: false
      });
      
      expect(change).toBe(0);
    });
  });
  
  describe('Vote Integration', () => {
    test('should increase MMR change with positive votes', () => {
      const baseChange = mmrEngine.calculateMMRChange({
        playerCurrentMMR: 1000,
        matchResult: 'win',
        netVotes: 0,
        opponentAvgMMR: 1000,
        isPlacementMatch: false
      });
      
      const positiveVoteChange = mmrEngine.calculateMMRChange({
        playerCurrentMMR: 1000,
        matchResult: 'win',
        netVotes: 5,
        opponentAvgMMR: 1000,
        isPlacementMatch: false
      });
      
      expect(positiveVoteChange).toBeGreaterThan(baseChange);
      expect(positiveVoteChange).toBe(baseChange + 10); // 5 votes * 2
    });
    
    test('should decrease MMR change with negative votes', () => {
      const baseChange = mmrEngine.calculateMMRChange({
        playerCurrentMMR: 1000,
        matchResult: 'win',
        netVotes: 0,
        opponentAvgMMR: 1000,
        isPlacementMatch: false
      });
      
      const negativeVoteChange = mmrEngine.calculateMMRChange({
        playerCurrentMMR: 1000,
        matchResult: 'win',
        netVotes: -3,
        opponentAvgMMR: 1000,
        isPlacementMatch: false
      });
      
      expect(negativeVoteChange).toBeLessThan(baseChange);
      expect(negativeVoteChange).toBe(baseChange - 6); // -3 votes * 2
    });
  });
  
  describe('Placement Matches', () => {
    test('should double MMR changes for placement matches', () => {
      const normalChange = mmrEngine.calculateMMRChange({
        playerCurrentMMR: 1000,
        matchResult: 'win',
        netVotes: 0,
        opponentAvgMMR: 1000,
        isPlacementMatch: false
      });
      
      const placementChange = mmrEngine.calculateMMRChange({
        playerCurrentMMR: 1000,
        matchResult: 'win',
        netVotes: 0,
        opponentAvgMMR: 1000,
        isPlacementMatch: true
      });
      
      expect(placementChange).toBe(normalChange * 2);
    });
  });
  
  describe('Rank Calculation', () => {
    test('should calculate correct rank from MMR', () => {
      expect(mmrEngine.getRankFromMMR(500)).toEqual({ tier: 'bronze', division: 3 });
      expect(mmrEngine.getRankFromMMR(1000)).toEqual({ tier: 'silver', division: 1 });
      expect(mmrEngine.getRankFromMMR(1300)).toEqual({ tier: 'gold', division: 1 });
      expect(mmrEngine.getRankFromMMR(1600)).toEqual({ tier: 'platinum', division: 1 });
      expect(mmrEngine.getRankFromMMR(1900)).toEqual({ tier: 'diamond', division: 1 });
      expect(mmrEngine.getRankFromMMR(2200)).toEqual({ tier: 'champion', division: 1 });
      expect(mmrEngine.getRankFromMMR(2500)).toEqual({ tier: 'champion', division: 4 });
    });
  });
  
  describe('System Balance', () => {
    test('should prevent MMR inflation over many games', () => {
      // Simula 1000 partite random
      let totalMMRChange = 0;
      
      for (let i = 0; i < 1000; i++) {
        const randomResult = ['win', 'loss', 'draw'][Math.floor(Math.random() * 3)];
        const randomVotes = Math.floor(Math.random() * 19) - 9; // -9 a +9
        
        const change = mmrEngine.calculateMMRChange({
          playerCurrentMMR: 1000,
          matchResult: randomResult as any,
          netVotes: randomVotes,
          opponentAvgMMR: 1000,
          isPlacementMatch: false
        });
        
        totalMMRChange += change;
      }
      
      // Con abbastanza campioni, la media dovrebbe essere vicina a 0
      const averageChange = totalMMRChange / 1000;
      expect(Math.abs(averageChange)).toBeLessThan(2);
    });
  });
});
```

#### Task 6.2: Integration Testing
**Owner**: QA Engineer  
**Effort**: 12 ore  
**Deliverable**: Test end-to-end workflow completo

**File**: `tests/integration/rank-system.test.ts`
```typescript
describe('Rank System Integration', () => {
  describe('Match Completion Flow', () => {
    test('should update player ranks after match completion', async () => {
      // 1. Crea partita test
      const match = await createTestMatch();
      
      // 2. Simula voti
      await submitTestVotes(match.id);
      
      // 3. Finalizza partita
      const response = await request(app)
        .post(`/api/matches/${match.id}/finalize-voting`)
        .expect(200);
      
      // 4. Verifica aggiornamento rank
      const playerRank = await request(app)
        .get(`/api/ranks/${testPlayer.email}`)
        .expect(200);
      
      expect(playerRank.body.currentMMR).toBeDefined();
      expect(playerRank.body.currentRank).toBeDefined();
    });
  });
  
  describe('Emblem System Integration', () => {
    test('should unlock emblems when thresholds are met', async () => {
      // Simula giocatore che raggiunge soglia goleador
      await updatePlayerStats(testPlayer.email, { gol: 10 });
      
      const emblems = await request(app)
        .get(`/api/emblems/${testPlayer.email}`)
        .expect(200);
      
      const goleadorEmblem = emblems.body.find(e => e.emblemType === 'goleador');
      expect(goleadorEmblem.currentLevel).toBe('bronze');
    });
  });
});
```

#### Task 6.3: Performance Testing
**Owner**: QA Engineer  
**Effort**: 8 ore  
**Deliverable**: Benchmark performance SVG vs PNG

**File**: `tests/performance/svg-generation.test.ts`
```typescript
describe('SVG Performance', () => {
  test('should generate SVG cards under 100ms', async () => {
    const start = performance.now();
    
    await request(app)
      .get(`/api/card-svg/${testPlayer.email}`)
      .expect(200);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
  
  test('should handle concurrent SVG generation', async () => {
    const promises = Array.from({ length: 10 }, () =>
      request(app).get(`/api/card-svg/${testPlayer.email}`)
    );
    
    const start = performance.now();
    await Promise.all(promises);
    const duration = performance.now() - start;
    
    // 10 richieste concurrent dovrebbero completare in <500ms
    expect(duration).toBeLessThan(500);
  });
});
```

#### Task 6.4: Deployment Strategy
**Owner**: DevOps  
**Effort**: 12 ore  
**Deliverable**: Piano deployment graduale con feature flags

**Strategia di Deployment**:

1. **Phase A: Staging Deployment**
   - Deploy completo in ambiente staging
   - Test con 5-10 utenti beta per 1 settimana
   - Raccolta feedback e fine-tuning algoritmo

2. **Phase B: Parallel System (Feature Flag)**
   - Deploy in produzione con feature flag disabilitato
   - Utenti vedono ancora sistema vecchio
   - Sistema rank funziona in background per raccogliere dati

3. **Phase C: Gradual Rollout**
   - Abilitazione graduale: 10% → 50% → 100% utenti
   - Monitoraggio continuo metriche performance
   - Rollback immediato se problemi critici

4. **Phase D: Full Migration**
   - Rimozione sistema vecchio
   - Cleanup codice legacy
   - Documentazione finale

---

## 📊 SUCCESS METRICS

### Performance Targets
- **Card Loading**: SVG generation <100ms (vs PNG ~300ms)
- **API Response**: Rank endpoints <200ms
- **Database**: Airtable queries <500ms

### User Engagement
- **Session Time**: +30% tempo medio in app
- **Match Frequency**: +20% partite per utente/mese
- **User Retention**: +15% retention 7-giorni

### System Reliability
- **MMR Accuracy**: <1% errori calcolo
- **Emblem Precision**: 100% accuracy nelle soglie
- **Data Consistency**: Zero lost data durante migrazione

---

## 🔧 RISORSE E TIMELINE

### Team Requirements
- **1 Backend Developer Senior**: 120 ore
- **1 Frontend Developer Senior**: 100 ore  
- **1 QA Engineer**: 30 ore
- **1 DevOps Engineer**: 20 ore

### Infrastructure
- **Airtable**: 3 nuove tabelle + estensione storage
- **CDN**: Cache policy per SVG assets
- **Monitoring**: Dashboards per metriche MMR

### Total Effort: ~270 ore (14 settimane con team part-time)

---

## ⚠️ RISK ASSESSMENT

### High Risk
- **MMR Balance**: Algoritmo potrebbe richiedere fine-tuning post-deploy
- **User Acceptance**: Cambio paradigma potrebbe confondere utenti esistenti
- **Data Migration**: Rischio perdita dati durante conversione

### Medium Risk  
- **Performance**: SVG generation potrebbe essere più lenta del previsto
- **Airtable Limits**: Nuove tabelle potrebbero superare limiti free tier

### Mitigation Strategies
- **Extensive Testing**: 2 settimane dedicate a testing prima del deploy
- **Gradual Rollout**: Feature flags per controllo granulare rilascio
- **Backup Strategy**: Sistema rollback completo entro 24h

---

## 📝 CONCLUSIONI

Il sistema rank-based rappresenta un'evoluzione naturale e necessaria per Calcettinho, allineandolo agli standard moderni di gamification. La roadmap garantisce:

- **Trasformazione graduale** senza disruption per utenti esistenti
- **Sistema tecnicamente robusto** con algoritmi bilanciati
- **Performance migliorata** tramite SVG embedded
- **User experience superiore** con progression più coinvolgente

**Ready to start Phase 1! 🚀** 