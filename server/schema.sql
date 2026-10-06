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
-- Only versions that committed a pointer switch may expose immutable resource URLs.
create table if not exists published_versions (
  site_id text not null references sites(id), version_id text not null,
  published_revision integer not null, primary key (site_id, version_id)
);
create index if not exists published_versions_order on published_versions (site_id, published_revision desc);
-- A retirement claim blocks every future pointer switch before any file deletion.
create table if not exists version_retirements (
  site_id text not null references sites(id), version_id text not null,
  completed integer not null default 0 check (completed in (0,1)),
  primary key (site_id, version_id)
);
create index if not exists version_retirements_pending on version_retirements (completed, site_id, version_id);
-- Safe upgrade: register the current live versions only, never unfinished uploads.
insert or ignore into published_versions (site_id, version_id, published_revision)
  select id, active_version, revision from sites where active_version is not null;
-- Abonnemang (T07): behandlade Stripe-händelser (en gång per id) och senaste kända status per prenumeration.
create table if not exists billing_events (id text primary key, type text not null, created integer not null, result text not null, processed_at text not null);
create table if not exists subscriptions (
  id text primary key, user_id text not null, customer_id text, status text not null, product_ok integer not null,
  current_period_end integer, cancel_at_period_end integer not null default 0, last_event_created integer not null
);
create index if not exists subscriptions_user on subscriptions (user_id);
create table if not exists checkout_links (subscription_id text primary key, user_id text not null);
-- Gratisdrift utan R2 (inget betalkort): sajtens filer i D1. Nycklarna är oföränderliga (sites/<id>/v/<version>/<fil>).
-- D1 tillåter högst 2 MB per rad, så filer över 1,9 MB nekas vid publicering.
create table if not exists site_files (key text primary key, bytes blob not null, size integer not null, sha256 text not null, content_type text not null);
-- Egna domäner (T08): ett anspråk per konto och värdnamn med egen TXT-utmaning. Det partiella unika indexet gör att
-- en bekräftad domän bara kan tillhöra ett konto, även om två verifierar samtidigt. Ingen främmande nyckel mot sites,
-- så att radering av en sajt inte blockeras; kontoavslut ska ta bort kontots rader här.
-- status: pending (väntar på DNS) -> verified (ägarskap bevisat) -> active (värdnamnet är aktiverat hos Cloudflare).
create table if not exists custom_domains (
  hostname text not null, owner_id text not null, site_id text not null, token text not null,
  status text not null check (status in ('pending', 'verified', 'active')),
  created_at integer not null, verified_at integer, expires_at integer not null,
  primary key (hostname, owner_id)
);
create unique index if not exists custom_domains_confirmed on custom_domains (hostname) where status <> 'pending';
create index if not exists custom_domains_owner on custom_domains (owner_id);
create index if not exists custom_domains_site on custom_domains (site_id);
