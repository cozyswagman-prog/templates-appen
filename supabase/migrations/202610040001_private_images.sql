-- Apply after projects.sql in a separate Supabase test project first.
-- Fixed reservations cap each account at 100 immutable objects * 2 MiB.
-- Failed uploads retain their reservation; the same content can be retried.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images', 'project-images', false, 2097152,
        array['image/png','image/jpeg','image/webp','image/gif']);

create table public.project_images (
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (name ~ '^[a-f0-9]{64}\.(png|jpeg|webp|gif)$'),
  created_at timestamptz not null default now(),
  primary key (owner_id, name)
);
alter table public.project_images enable row level security;
alter table public.project_images force row level security;
revoke all on public.project_images from public, anon, authenticated;
grant select on public.project_images to authenticated;
create policy image_reservations_owner on public.project_images for select to authenticated
  using (owner_id = (select auth.uid()));

create function public.reserve_project_image(p_name text, p_owner uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null or p_owner is distinct from actor then
    raise exception 'Authentication changed' using errcode = '42501';
  end if;
  if p_name is null or p_name !~ '^[a-f0-9]{64}\.(png|jpeg|webp|gif)$' then
    raise exception 'Invalid image name' using errcode = '22023';
  end if;
  -- Serialize reservations for the same account. Counting without this lock
  -- would let simultaneous uploads exceed the quota.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 1042026));
  if exists (select 1 from public.project_images where owner_id = actor and name = p_name) then return; end if;
  if (select count(*) from public.project_images where owner_id = actor) >= 100 then
    raise exception 'Image quota reached' using errcode = 'PT413';
  end if;
  insert into public.project_images(owner_id, name) values (actor, p_name);
end;
$$;
revoke all on function public.reserve_project_image(text, uuid) from public, anon;
grant execute on function public.reserve_project_image(text, uuid) to authenticated;

-- Storage owns its schema; only add policies, never manipulate object rows
-- from the application. No UPDATE/DELETE: other projects may share these bytes.
create policy templates_images_read on storage.objects for select to authenticated
  using (bucket_id = 'project-images'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and exists (select 1 from public.project_images i
      where i.owner_id = (select auth.uid()) and storage.objects.name = i.owner_id::text || '/' || i.name));
create policy templates_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'project-images'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and exists (select 1 from public.project_images i
      where i.owner_id = (select auth.uid()) and storage.objects.name = i.owner_id::text || '/' || i.name));
commit;
