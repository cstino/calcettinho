/**
 * Migrazione one-shot Airtable -> Supabase per Calcettinho.
 *
 * Uso:
 *   npx tsx scripts/migrate-airtable-to-supabase.ts --dry-run   # simula, non scrive nulla su Supabase
 *   npx tsx scripts/migrate-airtable-to-supabase.ts             # esegue la migrazione per davvero
 *
 * Variabili d'ambiente richieste (in un .env nella root del repo):
 *   AIRTABLE_API_KEY, AIRTABLE_BASE_ID
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (service role: bypassa RLS, usare SOLO qui, mai nell'app deployata)
 *
 * Prerequisiti:
 *   1. Aver applicato supabase/migrations/0001_init.sql sul progetto Supabase.
 *   2. Aver creato due bucket Storage pubblici: "player-photos" e "card-templates".
 *   3. Aver lanciato `npm install` nella root (aggiunge airtable, @supabase/supabase-js, tsx).
 *
 * Lo script non va eseguito più di una volta sullo stesso progetto Supabase senza svuotare le tabelle:
 * non fa upsert generalizzato, fallisce su chiavi duplicate (comportamento voluto, per evitare doppioni silenziosi).
 */

import 'dotenv/config';
import Airtable from 'airtable';
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  throw new Error('AIRTABLE_API_KEY / AIRTABLE_BASE_ID mancanti nel .env');
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mancanti nel .env');
}

Airtable.configure({ apiKey: AIRTABLE_API_KEY });
const airtableBase = Airtable.base(AIRTABLE_BASE_ID);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function log(...args: unknown[]) {
  console.log(...args);
}

async function uploadAttachmentToStorage(
  url: string,
  bucket: string,
  path: string
): Promise<string | null> {
  if (DRY_RUN) {
    log(`  [dry-run] scaricherei ${url} -> storage://${bucket}/${path}`);
    return `dry-run://${bucket}/${path}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    log(`  ATTENZIONE: download fallito per ${url} (status ${response.status})`);
    return null;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'application/octet-stream';

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    log(`  ATTENZIONE: upload Storage fallito per ${path}:`, error.message);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

interface TableResult {
  table: string;
  airtableCount: number;
  supabaseInserted: number;
  ok: boolean;
}

const results: TableResult[] = [];

function recordResult(table: string, airtableCount: number, supabaseInserted: number) {
  const ok = DRY_RUN ? true : airtableCount === supabaseInserted;
  results.push({ table, airtableCount, supabaseInserted, ok });
  log(`${ok ? '✅' : '❌'} ${table}: Airtable=${airtableCount} Supabase=${supabaseInserted}`);
}

async function migrateWhitelist() {
  log('\n=== whitelist ===');
  const records = await airtableBase('whitelist').select().all();
  const rows = records.map((r) => ({
    email: (r.get('email') as string || '').toLowerCase().trim(),
    role: ((r.get('Role') as string) || 'user').toLowerCase(),
  })).filter((r) => r.email);

  let inserted = 0;
  if (!DRY_RUN && rows.length > 0) {
    const { error, count } = await supabase.from('whitelist').insert(rows, { count: 'exact' });
    if (error) throw error;
    inserted = count || rows.length;
  } else {
    inserted = rows.length;
  }
  recordResult('whitelist', records.length, inserted);
}

async function migratePlayers() {
  log('\n=== players ===');
  const records = await airtableBase('players').select().all();

  const rows = [];
  for (const r of records) {
    const email = r.get('email') as string;
    if (!email) continue;

    const photoAttachments = r.get('photoUrl') as Array<{ url: string }> | undefined;
    let photoUrl: string | null = null;

    if (photoAttachments && photoAttachments.length > 0) {
      // Niente encodeURIComponent qui: è una chiave di storage, non un segmento URL —
      // il client Supabase la codifica lui in getPublicUrl(). Farlo due volte produce
      // un URL pubblico rotto (doppia codifica di "@").
      photoUrl = await uploadAttachmentToStorage(
        photoAttachments[0].url,
        'player-photos',
        `${email}.jpg`
      );
    }

    rows.push({
      email,
      name: (r.get('name') as string) || email,
      photo_url: photoUrl,
      attacco: Number(r.get('Attacco')) || 50,
      difesa: Number(r.get('Difesa')) || 50,
      velocita: Number(r.get('Velocità')) || 50,
      forza: Number(r.get('Forza')) || 50,
      passaggio: Number(r.get('Passaggio')) || 50,
      portiere: Number(r.get('Portiere')) || 50,
    });
  }

  let inserted = 0;
  if (!DRY_RUN && rows.length > 0) {
    const { error, count } = await supabase.from('players').insert(rows, { count: 'exact' });
    if (error) throw error;
    inserted = count || rows.length;
  } else {
    inserted = rows.length;
  }
  recordResult('players', records.length, inserted);
}

async function migrateSpecialCards() {
  log('\n=== special_cards ===');
  const records = await airtableBase('special_cards').select().all();

  const rows = [];
  for (const r of records) {
    const templateId = r.get('template_id') as string;
    if (!templateId) continue;

    const templateAttachments = r.get('template_image') as Array<{ url: string }> | undefined;
    let templateImageUrl: string | null = null;

    if (templateAttachments && templateAttachments.length > 0) {
      templateImageUrl = await uploadAttachmentToStorage(
        templateAttachments[0].url,
        'card-templates',
        `${templateId}.png`
      );
    }

    rows.push({
      template_id: templateId,
      name: (r.get('name') as string) || templateId,
      description: (r.get('description') as string) || null,
      color: (r.get('color') as string) || null,
      template_image: templateImageUrl,
      color_1: (r.get('color_1') as string) || null,
      color_2: (r.get('color_2') as string) || null,
      color_3: (r.get('color_3') as string) || null,
      color_4: (r.get('color_4') as string) || null,
      color_5: (r.get('color_5') as string) || null,
      condition_type: (r.get('condition_type') as string) || 'player_stats',
      condition_field: (r.get('condition_field') as string) || null,
      condition_value: Number(r.get('condition_value')) || 0,
      ranking_behavior: (r.get('ranking_behavior') as string) || null,
      tie_breaker_rule: (r.get('tie_breaker_rule') as string) || null,
      is_active: r.get('is_active') !== false,
    });
  }

  let inserted = 0;
  if (!DRY_RUN && rows.length > 0) {
    const { error, count } = await supabase.from('special_cards').upsert(rows, { count: 'exact', onConflict: 'template_id' });
    if (error) throw error;
    inserted = count || rows.length;
  } else {
    inserted = rows.length;
  }
  recordResult('special_cards', records.length, inserted);
}

async function migratePlayerStats() {
  log('\n=== player_stats ===');
  const records = await airtableBase('player_stats').select().all();

  const rows = records
    .map((r) => ({
      player_email: r.get('playerEmail') as string,
      gol: Number(r.get('Gol')) || 0,
      partite_disputate: Number(r.get('partiteDisputate')) || 0,
      partite_vinte: Number(r.get('partiteVinte')) || 0,
      partite_pareggiate: Number(r.get('partitePareggiate')) || 0,
      partite_perse: Number(r.get('partitePerse')) || 0,
      assistenze: Number(r.get('assistenze')) || 0,
      cartellini_gialli: Number(r.get('cartelliniGialli')) || 0,
      cartellini_rossi: Number(r.get('cartelliniRossi')) || 0,
      up_votes: Number(r.get('upVotes')) || 0,
      down_votes: Number(r.get('downVotes')) || 0,
      neutral_votes: Number(r.get('neutralVotes')) || 0,
      motm_votes: Number(r.get('motmVotes')) || 0,
      minuti_giocati: Number(r.get('minutiGiocati')) || 0,
    }))
    .filter((r) => r.player_email);

  let inserted = 0;
  if (!DRY_RUN && rows.length > 0) {
    const { error, count } = await supabase.from('player_stats').insert(rows, { count: 'exact' });
    if (error) throw error;
    inserted = count || rows.length;
  } else {
    inserted = rows.length;
  }
  recordResult('player_stats', records.length, inserted);
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string' && value) {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return [];
}

function parseJsonObject(value: unknown): Record<string, { gol?: number; assist?: number; gialli?: number; rossi?: number }> {
  if (typeof value === 'string' && value) {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return {};
}

async function migrateMatches() {
  log('\n=== matches ===');
  const records = await airtableBase('matches').select().all();

  const matchRows = [];
  const matchPlayerStatsRows: Array<{ match_id: string; player_email: string; gol: number; assist: number; gialli: number; rossi: number }> = [];

  for (const r of records) {
    const matchId = r.get('IDmatch') as string;
    if (!matchId) continue;

    const teamA = parseJsonArray(r.get('teamA'));
    const teamB = parseJsonArray(r.get('teamB'));
    const playerStats = parseJsonObject(r.get('playerStats'));

    matchRows.push({
      match_id: matchId,
      match_date: (r.get('date') as string) || new Date().toISOString().slice(0, 10),
      team_a: teamA,
      team_b: teamB,
      score_a: r.get('scoreA') != null ? Number(r.get('scoreA')) : null,
      score_b: r.get('scoreB') != null ? Number(r.get('scoreB')) : null,
      team_a_scorer: (r.get('teamAscorer') as string) || (r.get('teamAScorer') as string) || null,
      team_b_scorer: (r.get('teamBscorer') as string) || (r.get('teamBScorer') as string) || null,
      assist_a: (r.get('AssistA') as string) || null,
      assist_b: (r.get('AssistB') as string) || null,
      completed: r.get('completed') === true || r.get('completed') === 'true',
      match_status: (r.get('match_status') as string) || 'scheduled',
      finalized: r.get('finalized') === true || r.get('finalized') === 'true',
      voting_status: (r.get('voting_status') as string) || 'open',
      voting_started_at: (r.get('voting_started_at') as string) || null,
      voting_closed_at: (r.get('voting_closed_at') as string) || null,
      voting_close_reason: (r.get('voting_close_reason') as string) || null,
      referee: (r.get('referee') as string) || null,
      location: (r.get('location') as string) || null,
    });

    Object.entries(playerStats).forEach(([email, stats]) => {
      matchPlayerStatsRows.push({
        match_id: matchId,
        player_email: email,
        gol: stats.gol || 0,
        assist: stats.assist || 0,
        gialli: stats.gialli || 0,
        rossi: stats.rossi || 0,
      });
    });
  }

  let inserted = 0;
  if (!DRY_RUN && matchRows.length > 0) {
    const { error, count } = await supabase.from('matches').insert(matchRows, { count: 'exact' });
    if (error) throw error;
    inserted = count || matchRows.length;
  } else {
    inserted = matchRows.length;
  }
  recordResult('matches', records.length, inserted);

  let statsInserted = 0;
  if (!DRY_RUN && matchPlayerStatsRows.length > 0) {
    const { error, count } = await supabase.from('match_player_stats').insert(matchPlayerStatsRows, { count: 'exact' });
    if (error) throw error;
    statsInserted = count || matchPlayerStatsRows.length;
  } else {
    statsInserted = matchPlayerStatsRows.length;
  }
  recordResult('match_player_stats', matchPlayerStatsRows.length, statsInserted);
}

async function migratePlayerAwards() {
  log('\n=== player_awards ===');
  const records = await airtableBase('player_awards').select().all();

  const rows = records
    .map((r) => ({
      player_email: r.get('player_email') as string,
      award_type: r.get('award_type') as string,
      match_id: (r.get('match_id') as string) || null,
      status: (r.get('status') as string) || 'pending',
      unlocked_at: (r.get('unlocked_at') as string) || null,
      selected: r.get('selected') === true,
    }))
    .filter((r) => r.player_email && r.award_type);

  let inserted = 0;
  if (!DRY_RUN && rows.length > 0) {
    const { error, count } = await supabase.from('player_awards').insert(rows, { count: 'exact' });
    if (error) throw error;
    inserted = count || rows.length;
  } else {
    inserted = rows.length;
  }
  recordResult('player_awards', records.length, inserted);
}

async function migrateVotes() {
  log('\n=== votes (transiente: normale che siano pochi/nessuno) ===');
  const records = await airtableBase('votes').select().all();

  const rows = records
    .map((r) => ({
      match_id: r.get('matchId') as string,
      from_player_id: r.get('fromPlayerId') as string,
      to_player_id: r.get('toPlayerId') as string,
      vote_type: r.get('voteType') as string,
      motm_vote: r.get('motm_vote') === true,
    }))
    .filter((r) => r.match_id && r.from_player_id && r.to_player_id);

  let inserted = 0;
  if (!DRY_RUN && rows.length > 0) {
    const { error, count } = await supabase.from('votes').insert(rows, { count: 'exact' });
    if (error) throw error;
    inserted = count || rows.length;
  } else {
    inserted = rows.length;
  }
  recordResult('votes', records.length, inserted);
}

async function main() {
  log(DRY_RUN ? '🔍 DRY RUN — nessuna scrittura su Supabase' : '🚀 Migrazione Airtable -> Supabase in corso');

  // Ordine che rispetta le dipendenze FK: whitelist/players/special_cards prima,
  // poi tutto ciò che referenzia players/matches.
  await migrateWhitelist();
  await migratePlayers();
  await migrateSpecialCards();
  await migratePlayerStats();
  await migrateMatches();
  await migratePlayerAwards();
  await migrateVotes();

  log('\n=== Riepilogo ===');
  results.forEach((r) => {
    log(`${r.ok ? '✅' : '❌'} ${r.table}: Airtable=${r.airtableCount} Supabase=${r.supabaseInserted}`);
  });

  const anyFailed = results.some((r) => !r.ok);
  if (anyFailed) {
    log('\n⚠️  Alcune tabelle non coincidono nei conteggi: verificare manualmente prima di procedere col cutover.');
    process.exitCode = 1;
  } else {
    log('\n✅ Migrazione completata, conteggi coerenti su tutte le tabelle.');
  }
}

main().catch((error) => {
  console.error('❌ Migrazione fallita:', error);
  process.exit(1);
});
