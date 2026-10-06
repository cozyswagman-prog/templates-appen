-- LOCAL PROPOSAL ONLY: deliberately outside migrations; never deployed by tooling.
-- Before deployment: include closure markers in backup/restore, coordinate D1,
-- publication, billing and in-flight requests, and verify real Auth/Storage APIs.
begin;
create table public.account_closures (
  owner_id uuid primary key,
  started_at timestamptz not null default clock_timestamp()
);
-- No FK: this denial marker must outlive Auth deletion and stale backup restore.
alter table public.account_closures enable row level security;
alter table public.account_closures force row level security;
revoke all on public.account_closures from public, anon, authenticated, service_role;
-- Read-only capture for backup v2. Customers retain no marker access.
grant select on public.account_closures to service_role;

create function public.account_access_open() returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null
    and exists(select 1 from auth.users where id=auth.uid())
    and not exists(select 1 from public.account_closures where owner_id=auth.uid());
$$;
revoke all on function public.account_access_open() from public, anon;
grant execute on function public.account_access_open() to authenticated;

create function public.assert_account_open(p_owner uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_owner is null then raise exception 'Account unavailable' using errcode='PT423'; end if;
  -- Same lock as save_project, image reservations, upload and image cleanup.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,1042026));
  if not exists(select 1 from auth.users where id=p_owner)
    or exists(select 1 from public.account_closures where owner_id=p_owner) then
    raise exception 'Account unavailable' using errcode='PT423';
  end if;
end;
$$;
revoke all on function public.assert_account_open(uuid) from public, anon, authenticated, service_role;

create function public.begin_account_closure(p_owner uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_owner is null then raise exception 'Invalid owner' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,1042026));
  if exists(select 1 from public.account_closures where owner_id=p_owner) then return; end if;
  if not exists(select 1 from auth.users where id=p_owner) then raise exception 'Unknown account' using errcode='PT404'; end if;
  insert into public.account_closures(owner_id) values(p_owner);
end;
$$;
revoke all on function public.begin_account_closure(uuid) from public, anon, authenticated;
grant execute on function public.begin_account_closure(uuid) to service_role;

create function public.guard_project_account() returns trigger
language plpgsql security definer set search_path='' as $$
begin perform public.assert_account_open(new.owner_id); return new; end;
$$;
revoke all on function public.guard_project_account() from public, anon, authenticated, service_role;
create trigger account_open_project before insert or update on public.projects
  for each row execute function public.guard_project_account();

create function public.guard_image_account() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  -- Cleanup can still retire/finish existing reservations, but cannot renew them.
  if tg_op='INSERT' or new.lease_until is distinct from old.lease_until
    or (new.state='active' and old.state<>'active') or new.owner_id is distinct from old.owner_id
    or new.name is distinct from old.name then
    perform public.assert_account_open(new.owner_id);
  end if;
  return new;
end;
$$;
revoke all on function public.guard_image_account() from public, anon, authenticated, service_role;
create trigger account_open_image before insert or update on public.project_images
  for each row execute function public.guard_image_account();

create function public.guard_storage_account() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.bucket_id='project-images' then
    perform public.assert_account_open(split_part(new.name,'/',1)::uuid);
  end if;
  return new;
end;
$$;
revoke all on function public.guard_storage_account() from public, anon, authenticated, service_role;
create trigger templates_account_open_storage before insert or update on storage.objects
  for each row execute function public.guard_storage_account();

create policy account_open_projects on public.projects as restrictive for select to authenticated
  using(public.account_access_open());
create policy account_open_images on public.project_images as restrictive for select to authenticated
  using(public.account_access_open());
create policy account_open_storage on storage.objects as restrictive for select to authenticated
  using(bucket_id<>'project-images' or public.account_access_open());

-- Also block user-driven deletion while an operator is working. Operator SQL
-- deletion is unaffected; Storage bytes still require the real Storage API.
create or replace function public.delete_project(p_id text,p_revision integer,p_owner uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or p_owner is distinct from auth.uid() then raise exception 'Authentication changed' using errcode='42501'; end if;
  perform public.assert_account_open(p_owner);
  perform public.delete_project_before_images(p_id,p_revision,p_owner);
end;
$$;
commit;
