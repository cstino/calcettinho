import { createClient } from '@supabase/supabase-js';

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

export interface Player {
  nome: string;
  email: string;
  foto: string;
  photoUrl: string;
  ATT: number;
  DEF: number;
  VEL: number;
  FOR: number;
  PAS: number;
  POR: number;
}

function mapPlayerRow(row: {
  email: string;
  name: string;
  photo_url: string | null;
  attacco: number;
  difesa: number;
  velocita: number;
  forza: number;
  passaggio: number;
  portiere: number;
}): Player {
  const photoUrl = row.photo_url || '';
  return {
    nome: row.name,
    email: row.email,
    foto: photoUrl,
    photoUrl,
    ATT: Number(row.attacco) || 0,
    DEF: Number(row.difesa) || 0,
    VEL: Number(row.velocita) || 0,
    FOR: Number(row.forza) || 0,
    PAS: Number(row.passaggio) || 0,
    POR: Number(row.portiere) || 0,
  };
}

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase.from('players').select('*');

  if (error) {
    console.error('Errore nel recupero dei giocatori da Supabase:', error);
    throw error;
  }

  return (data || []).map(mapPlayerRow);
}

export async function getPlayerByEmail(email: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Errore nel recupero del giocatore da Supabase:', error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapPlayerRow(data);
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

export interface SpecialCardData {
  name: string;
  description: string;
  color: string;
  templateUrl: string;
  color_1: string | null;
  color_2: string | null;
  color_3: string | null;
  color_4: string | null;
  color_5: string | null;
}

export async function getSpecialCardData(template: string): Promise<SpecialCardData | null> {
  const { data, error } = await supabase
    .from('special_cards')
    .select('*')
    .eq('template_id', template)
    .maybeSingle();

  if (error) {
    console.error('Errore nel recupero dati card special:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    name: data.name || 'Card Special',
    description: data.description || 'Descrizione non disponibile',
    color: data.color || '#B45309',
    templateUrl: data.template_image || '',
    color_1: data.color_1,
    color_2: data.color_2,
    color_3: data.color_3,
    color_4: data.color_4,
    color_5: data.color_5,
  };
}
