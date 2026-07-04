-- Calcettinho: schema iniziale Supabase (sostituisce Airtable)
-- Vedi piano di migrazione per il contesto completo.

create extension if not exists citext;
create extension if not exists pgcrypto;

-- players
create table if not exists players (
  email        citext primary key,
  name         text not null,
  photo_url    text,                 -- Supabase Storage public URL (bucket player-photos)
  attacco      numeric(4,1) not null default 50.0,
  difesa       numeric(4,1) not null default 50.0,
  velocita     numeric(4,1) not null default 50.0,
  forza        numeric(4,1) not null default 50.0,
  passaggio    numeric(4,1) not null default 50.0,
  portiere     numeric(4,1) not null default 50.0,
  created_at   timestamptz not null default now()
);

-- player_stats
create table if not exists player_stats (
  player_email       citext primary key references players(email) on delete cascade,
  gol                integer not null default 0,
  partite_disputate  integer not null default 0,
  partite_vinte      integer not null default 0,
  partite_pareggiate integer not null default 0,
  partite_perse      integer not null default 0,
  assistenze         integer not null default 0,
  cartellini_gialli  integer not null default 0,
  cartellini_rossi   integer not null default 0,
  up_votes           integer not null default 0,
  down_votes         integer not null default 0,
  neutral_votes      integer not null default 0,
  motm_votes         integer not null default 0,
  minuti_giocati     integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- matches
create table if not exists matches (
  match_id            text primary key,     -- match_${Date.now()}, come nel sistema attuale
  match_date          date not null,
  team_a              citext[] not null default '{}',
  team_b              citext[] not null default '{}',
  score_a             integer,
  score_b             integer,
  team_a_scorer       text,
  team_b_scorer       text,
  assist_a            text,
  assist_b            text,
  completed           boolean not null default false,
  match_status        text,
  finalized           boolean not null default false,
  voting_status       text not null default 'open' check (voting_status in ('open','closed')),
  voting_started_at   timestamptz,
  voting_closed_at    timestamptz,
  voting_close_reason text,
  referee             citext references players(email),
  location            text,
  created_at          timestamptz not null default now()
);

-- match_player_stats (sostituisce il blob JSON matches.playerStats di Airtable)
create table if not exists match_player_stats (
  match_id     text not null references matches(match_id) on delete cascade,
  player_email citext not null references players(email) on delete cascade,
  gol          integer not null default 0,
  assist       integer not null default 0,
  gialli       integer not null default 0,
  rossi        integer not null default 0,
  primary key (match_id, player_email)
);

-- votes (transiente: righe cancellate dopo aggregazione in player_stats)
create table if not exists votes (
  id             uuid primary key default gen_random_uuid(),
  match_id       text not null references matches(match_id) on delete cascade,
  from_player_id citext not null references players(email),
  to_player_id   citext not null references players(email),
  vote_type      text not null check (vote_type in ('UP','DOWN','NEUTRAL')),
  motm_vote      boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists votes_match_id_idx on votes(match_id);
create index if not exists votes_to_player_id_idx on votes(to_player_id);

-- player_awards
create table if not exists player_awards (
  id           uuid primary key default gen_random_uuid(),
  player_email citext not null references players(email) on delete cascade,
  award_type   text not null,
  match_id     text,   -- puo' valere 'retroactive-check' (sentinel): niente FK stretta verso matches
  status       text not null default 'pending' check (status in ('pending','unlocked')),
  unlocked_at  timestamptz,
  selected     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists player_awards_player_email_idx on player_awards(player_email);

-- special_cards (configurazione achievement)
create table if not exists special_cards (
  template_id      text primary key,
  name             text not null,
  description      text,
  color            text,
  template_image   text,  -- Supabase Storage URL (bucket card-templates)
  color_1          text,
  color_2          text,
  color_3          text,
  color_4          text,
  color_5          text,
  condition_type   text not null check (condition_type in ('post_match','player_stats','milestone','votes')),
  condition_field  text,
  condition_value  numeric,
  ranking_behavior text,
  tie_breaker_rule text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- whitelist
create table if not exists whitelist (
  email      citext primary key,
  role       text not null default 'user' check (role in ('admin','arbitro','user')),
  created_at timestamptz not null default now()
);
