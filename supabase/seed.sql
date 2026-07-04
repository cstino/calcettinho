-- Seed delle milestone (special_cards) — porting di netlify/functions/fix-milestone-configuration.js.
-- Le card premio non-milestone (motm, 1presenza, goleador, assistman) con relativi template_image/color_*
-- vanno migrate da Airtable via scripts/migrate-airtable-to-supabase.ts, dato che contengono asset immagine.
-- Questo seed copre solo le milestone a soglia su statistiche cumulative, gestite storicamente via codice.

insert into special_cards (template_id, name, description, condition_type, condition_field, condition_value, ranking_behavior, is_active)
values
  ('goleador', 'Goleador', '10 gol segnati in carriera', 'player_stats', 'gol', 10, 'threshold_met', true),
  ('matador', 'Matador', '25 gol segnati in carriera', 'player_stats', 'gol', 25, 'threshold_met', true),
  ('goldenboot', 'Golden Boot', '50 gol segnati in carriera', 'player_stats', 'gol', 50, 'threshold_met', true),
  ('assistman', 'Assist Man', '10 assist forniti in carriera', 'player_stats', 'assistenze', 10, 'threshold_met', true),
  ('regista', 'Regista', '25 assist forniti in carriera', 'player_stats', 'assistenze', 25, 'threshold_met', true),
  ('elfutbol', 'El fútbol', '50 assist forniti in carriera', 'player_stats', 'assistenze', 50, 'threshold_met', true),
  ('win10', '10 Vittorie', '10 vittorie in carriera', 'player_stats', 'partiteVinte', 10, 'threshold_met', true),
  ('win25', '25 Vittorie', '25 vittorie in carriera', 'player_stats', 'partiteVinte', 25, 'threshold_met', true),
  ('win50', '50 Vittorie', '50 vittorie in carriera', 'player_stats', 'partiteVinte', 50, 'threshold_met', true),
  ('1presenza', 'Prima Presenza', 'Prima partita giocata', 'player_stats', 'partiteDisputate', 1, 'threshold_met', true)
on conflict (template_id) do update set
  name = excluded.name,
  description = excluded.description,
  condition_type = excluded.condition_type,
  condition_field = excluded.condition_field,
  condition_value = excluded.condition_value,
  ranking_behavior = excluded.ranking_behavior,
  is_active = excluded.is_active;
