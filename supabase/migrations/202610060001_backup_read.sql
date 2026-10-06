-- Backup (npm run backup:create): let service_role read the three tables.
-- service_role is only used server-side/CLI with the secret key, never in the browser.
-- No privileges for anon or authenticated change, and no write access is added.
begin;
grant usage on schema public to service_role;
grant select on public.projects, public.project_images, public.project_image_refs to service_role;
commit;
