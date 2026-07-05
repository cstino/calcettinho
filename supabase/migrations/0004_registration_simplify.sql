-- Calcettinho: semplifica la registrazione — un'unica richiesta con nome, username
-- e foto già inclusi, accettazione diretta dell'admin senza codice monouso.

begin;

alter table registration_requests
  add column if not exists full_name text,
  add column if not exists username citext,
  add column if not exists raw_photo_url text;

comment on column registration_requests.note is 'DEPRECATED: sostituito da full_name/username/raw_photo_url';
comment on column registration_requests.invite_code is 'DEPRECATED: il flusso non usa più codici, approvazione diretta';
comment on column registration_requests.code_used_at is 'DEPRECATED';

commit;
