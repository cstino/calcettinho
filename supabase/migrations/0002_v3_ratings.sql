-- Calcettinho v3: rating 1-10, stats calcolate, contatori era ranked, storico per-match.
--
-- PREREQUISITO OPERATIVO: nessuna votazione aperta al momento dell'applicazione.
-- Prima del cutover: finalizzare le votazioni aperte col vecchio sistema
-- (POST /api/admin/force-finalize-match) e non inserire nuovi risultati fino a fine deploy.

begin;

-- 1) votes: da UP/DOWN/NEUTRAL + motm_vote a tre rating 1-10.
--    Tabella transiente: si svuota al cutover (i voti del vecchio formato non sono convertibili).
delete from votes;

alter table votes
  drop column vote_type,
  drop column motm_vote,
  add column dif_rating smallint not null check (dif_rating between 1 and 10),
  add column por_rating smallint not null check (por_rating between 1 and 10),
  add column mvp_rating smallint not null check (mvp_rating between 1 and 10);

-- Guardia DB contro doppi voti (finora solo applicativa in votes/submit)
create unique index if not exists votes_voter_target_uniq
  on votes(match_id, from_player_id, to_player_id);

-- 2) player_stats: contatori era ranked + somme/conteggi rating.
--    I contatori storici (gol, assistenze, partite_*) NON si toccano: continuano ad
--    aggiornarsi per achievements e classifiche. up/down/neutral/motm_votes restano
--    congelati (nessuna scrittura, nessun drop).
alter table player_stats
  add column if not exists rk_matches integer not null default 0,
  add column if not exists rk_goals   integer not null default 0,
  add column if not exists rk_assists integer not null default 0,
  add column if not exists dif_sum    integer not null default 0,
  add column if not exists dif_count  integer not null default 0,
  add column if not exists por_sum    integer not null default 0,
  add column if not exists por_count  integer not null default 0,
  add column if not exists mvp_sum    integer not null default 0,
  add column if not exists mvp_count  integer not null default 0;

comment on column player_stats.up_votes      is 'DEPRECATED v3: frozen, sistema UP/DOWN dismesso';
comment on column player_stats.down_votes    is 'DEPRECATED v3: frozen';
comment on column player_stats.neutral_votes is 'DEPRECATED v3: frozen';
comment on column player_stats.motm_votes    is 'DEPRECATED v3: frozen (MOTM ora da player_awards)';

-- 3) players: le 6 colonne abilità restano ma sono deprecate (drop in una futura 0003,
--    dopo un periodo di stabilità). Tenerle = cutover zero-downtime + rollback possibile.
comment on column players.attacco   is 'DEPRECATED v3: stats ora calcolate da player_stats (vedi playerRating.ts)';
comment on column players.difesa    is 'DEPRECATED v3';
comment on column players.velocita  is 'DEPRECATED v3';
comment on column players.forza     is 'DEPRECATED v3';
comment on column players.passaggio is 'DEPRECATED v3';
comment on column players.portiere  is 'DEPRECATED v3';

comment on column special_cards.template_image is 'DEPRECATED v3: le cornici sono renderizzate in codice (frames.tsx)';

-- 4) match_ratings: snapshot aggregato per-partita, scritto in finalizeVoting PRIMA
--    della cancellazione dei votes. Storico permanente delle prestazioni.
create table if not exists match_ratings (
  match_id      text not null references matches(match_id) on delete cascade,
  player_email  citext not null references players(email) on delete cascade,
  dif_avg       numeric(4,2) not null,
  por_avg       numeric(4,2) not null,
  mvp_avg       numeric(4,2) not null,
  ratings_count integer not null default 0,
  is_motm       boolean not null default false,
  created_at    timestamptz not null default now(),
  primary key (match_id, player_email)
);
create index if not exists match_ratings_player_idx on match_ratings(player_email, created_at desc);

commit;
