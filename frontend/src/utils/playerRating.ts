/**
 * Unica fonte di verità per il calcolo delle stats v3.
 * Modulo puro (nessun import di supabase): usato identico da API routes e client.
 *
 * Le stats sono DERIVATE dalle prestazioni dell'era ranked (partite giocate col
 * sistema di voti 1-10), non più valori manuali evoluti dall'algoritmo Fair:
 *  - ATT: curva saturante sul rapporto gol/partita
 *  - PAS: curva saturante sul rapporto assist/partita
 *  - DIF: media dei voti 1-10 ricevuti sulla prestazione difensiva, scalata a 1-99
 *  - POR: media dei voti 1-10 ricevuti sulla prestazione in porta, scalata a 1-99
 *  - Overall: media dei 3 valori migliori (si scarta il peggiore)
 */

export const RANKED_MIN_MATCHES = 5;

export type CardTier = 'unranked' | 'bronzo' | 'argento' | 'oro' | 'platino' | 'champion';

// Sottoinsieme di player_stats (colonne snake_case come arrivano da Supabase)
export interface RatingSourceRow {
  rk_matches: number;
  rk_goals: number;
  rk_assists: number;
  dif_sum: number;
  dif_count: number;
  por_sum: number;
  por_count: number;
  mvp_sum: number;
  mvp_count: number;
}

export interface ComputedStats {
  ranked: boolean;
  rkMatches: number;
  ATT: number;
  PAS: number;
  DIF: number;
  POR: number;
  overall: number;
  tier: CardTier;
  // medie 1-10 (1 decimale) per profilo/compare
  difAvg: number;
  porAvg: number;
  mvpAvg: number;
}

// Curva saturante: crescita rapida all'inizio, sempre più difficile salire, mai oltre 99.
// r = eventi/partita. r=1 → 50, r=2 → 66, r=3 → 74, r=6 → 85.
export function ratioCurve(perMatch: number): number {
  if (perMatch <= 0) return 0;
  return Math.round((99 * perMatch) / (perMatch + 1));
}

// Media voti 1-10 → scala 1-99
function ratingScale(sum: number, count: number): number {
  if (count <= 0) return 0;
  return Math.round((sum / count) * 9.9);
}

function avg1(sum: number, count: number): number {
  if (count <= 0) return 0;
  return Math.round((sum / count) * 10) / 10;
}

export function getTier(overall: number, ranked: boolean): CardTier {
  if (!ranked) return 'unranked';
  if (overall >= 93) return 'champion';
  if (overall >= 85) return 'platino';
  if (overall >= 75) return 'oro';
  if (overall >= 65) return 'argento';
  return 'bronzo';
}

export function tierLabel(tier: CardTier): string {
  const labels: Record<CardTier, string> = {
    unranked: 'Unranked',
    bronzo: 'Bronzo',
    argento: 'Argento',
    oro: 'Oro',
    platino: 'Platino',
    champion: 'Champion',
  };
  return labels[tier];
}

export const TIER_ORDER: CardTier[] = ['champion', 'platino', 'oro', 'argento', 'bronzo', 'unranked'];

export function computeStats(row: Partial<RatingSourceRow> | null | undefined): ComputedStats {
  const rkMatches = row?.rk_matches ?? 0;
  const rkGoals = row?.rk_goals ?? 0;
  const rkAssists = row?.rk_assists ?? 0;
  const difSum = row?.dif_sum ?? 0;
  const difCount = row?.dif_count ?? 0;
  const porSum = row?.por_sum ?? 0;
  const porCount = row?.por_count ?? 0;
  const mvpSum = row?.mvp_sum ?? 0;
  const mvpCount = row?.mvp_count ?? 0;

  const ranked = rkMatches >= RANKED_MIN_MATCHES;

  const ATT = rkMatches > 0 ? ratioCurve(rkGoals / rkMatches) : 0;
  const PAS = rkMatches > 0 ? ratioCurve(rkAssists / rkMatches) : 0;
  const DIF = ratingScale(difSum, difCount);
  const POR = ratingScale(porSum, porCount);

  // Overall: media dei 3 migliori dei 4 (scarta il minore)
  const sorted = [ATT, PAS, DIF, POR].sort((a, b) => b - a);
  const overall = Math.round((sorted[0] + sorted[1] + sorted[2]) / 3);

  return {
    ranked,
    rkMatches,
    ATT,
    PAS,
    DIF,
    POR,
    overall,
    tier: getTier(overall, ranked),
    difAvg: avg1(difSum, difCount),
    porAvg: avg1(porSum, porCount),
    mvpAvg: avg1(mvpSum, mvpCount),
  };
}
