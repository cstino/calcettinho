-- Calcettinho: eliminazione utenti con finestra di ripristino di 7 giorni.
--
-- "Eliminazione" = revoca dell'accesso (whitelist) + deleted_at impostato.
-- La riga players NON viene mai cancellata fisicamente: player_stats,
-- match_player_stats, player_awards e match_ratings referenziano players(email)
-- e devono restare intatti per sempre (storico condiviso con gli altri
-- giocatori delle partite passate). "Definitivo" dopo 7 giorni significa solo
-- che il pulsante Ripristina smette di essere disponibile, non una cancellazione.

begin;

alter table players
  add column if not exists deleted_at timestamptz;

create index if not exists players_deleted_at_idx on players(deleted_at) where deleted_at is not null;

commit;
