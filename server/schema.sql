-- D1-schema för publicerade sajter (prototyp). Filerna ligger i R2 under sites/<id>/v/<version>/.
-- revision ökar vid varje växling; publicering och återställning växlar bara om revisionen är oförändrad.
-- owner_id är Supabase-användarens id; bara ägaren får publicera via /api/publish.
create table if not exists sites (
  id text primary key check (id glob '[a-z0-9]*' and length(id) between 3 and 63),
  host text not null unique,
  owner_id text,
  active_version text,
  revision integer not null default 0 check (revision >= 0)
);
-- Piloten: en sajt per konto, även om två flikar skapar samtidigt. Sajter utan ägare (prov) undantas.
create unique index if not exists sites_one_per_owner on sites (owner_id);
