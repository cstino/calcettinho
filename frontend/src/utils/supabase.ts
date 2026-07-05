import { createClient } from '@supabase/supabase-js';
import { computeStats, type ComputedStats } from './playerRating';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL non trovata nelle variabili d\'ambiente');
}

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY non trovata nelle variabili d\'ambiente');
}

// Client server-side con service role: usato solo dentro le API routes,
// mai esposto al browser (non ha il prefisso NEXT_PUBLIC_).
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface PlayerIdentity {
  nome: string;
  email: string;
  photoUrl: string;
}

// Giocatore con stats v3 calcolate (vedi playerRating.ts) + frame attivo
export interface Player extends PlayerIdentity, ComputedStats {
  selectedFrame: string | null;
}

export async function getPlayerIdentity(email: string): Promise<PlayerIdentity | null> {
  const { data, error } = await supabase
    .from('players')
    .select('email, name, photo_url')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Errore nel recupero del giocatore da Supabase:', error);
    throw error;
  }

  if (!data) return null;

  return { nome: data.name, email: data.email, photoUrl: data.photo_url || '' };
}

export async function getPlayers(): Promise<Player[]> {
  const [playersRes, statsRes, framesRes] = await Promise.all([
    supabase.from('players').select('email, name, photo_url'),
    supabase.from('player_stats').select('*'),
    supabase.from('player_awards').select('player_email, award_type').eq('selected', true),
  ]);

  if (playersRes.error) throw playersRes.error;
  if (statsRes.error) throw statsRes.error;

  const statsByEmail = new Map((statsRes.data || []).map((row) => [String(row.player_email).toLowerCase(), row]));
  const frameByEmail = new Map(
    (framesRes.data || []).map((row) => [String(row.player_email).toLowerCase(), row.award_type as string])
  );

  return (playersRes.data || []).map((p) => {
    const key = String(p.email).toLowerCase();
    return {
      nome: p.name,
      email: p.email,
      photoUrl: p.photo_url || '',
      selectedFrame: frameByEmail.get(key) || null,
      ...computeStats(statsByEmail.get(key)),
    };
  });
}

export async function isEmailWhitelisted(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('whitelist')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Errore nel controllo whitelist:', error);
    return false;
  }

  return !!data;
}
