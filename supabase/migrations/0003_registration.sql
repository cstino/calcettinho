-- Calcettinho: pannello admin unificato — registrazione su invito, cura foto, sandbox voti.
--
-- Nessun impatto sui 34 giocatori esistenti: username nullable, status default 'active'.

begin;

-- 1) registration_requests: richieste pubbliche di accesso, gestite dall'admin.
create table if not exists registration_requests (
  id           uuid primary key default gen_random_uuid(),
  email        citext not null,
  note         text,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  invite_code  text,
  code_used_at timestamptz,
  created_at   timestamptz not null default now(),
  decided_at   timestamptz
);

-- Una sola richiesta pending per email (si può ririchiedere se rifiutata).
create unique index if not exists registration_requests_pending_email_uniq
  on registration_requests(email) where status = 'pending';

create index if not exists registration_requests_status_idx on registration_requests(status, created_at desc);

-- 2) players: username scelto dall'utente (mostrato sulla card), stato registrazione,
--    foto grezza caricata prima della cura admin.
alter table players
  add column if not exists username citext unique check (char_length(username) between 2 and 12 and username ~ '^[A-Za-z0-9_]+$'),
  add column if not exists status text not null default 'active' check (status in ('pending_review', 'active')),
  add column if not exists raw_photo_url text;

-- 3) sandbox_sessions: snapshot di player_stats per i giocatori coinvolti in una partita
--    di test, così la pulizia successiva può ripristinare lo stato esatto pre-test
--    (stesso procedimento usato manualmente per validare la v3).
create table if not exists sandbox_sessions (
  match_id   text primary key references matches(match_id) on delete cascade,
  snapshot   jsonb not null,
  created_at timestamptz not null default now()
);

commit;
