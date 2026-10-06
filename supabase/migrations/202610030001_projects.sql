-- Apply to an approved, separate Supabase TEST project first. No real data here.
begin;

create table public.projects (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (id ~ '^[a-zA-Z0-9_-]{1,100}$'),
  content jsonb not null,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id),
  constraint project_content_valid check (
    jsonb_typeof(content) = 'object'
    and content ?& array['name', 'templateId', 'values']
    and jsonb_typeof(content->'name') = 'string'
    and length(content->>'name') between 1 and 200
    and jsonb_typeof(content->'templateId') = 'string'
    and content->>'templateId' in ('restaurang','salong','byggfirma','butik','portfolio','cafe','gym','konsult','hemservice')
    and jsonb_typeof(content->'values') = 'object'
    and octet_length(content::text) <= 20971520
  )
);
create index projects_owner_updated on public.projects (owner_id, updated_at desc);
alter table public.projects enable row level security;
alter table public.projects force row level security;
create policy projects_read_own on public.projects for select to authenticated
  using (owner_id = (select auth.uid()));

-- Clients can read through RLS but cannot bypass revision checks with table writes.
revoke all on public.projects from public, anon, authenticated;
grant select on public.projects to authenticated;

create function public.save_project(p_id text, p_content jsonb, p_revision integer, p_owner uuid)
returns setof public.projects
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_project public.projects;
begin
  if v_owner is null or p_owner is distinct from v_owner then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_revision is null or p_revision < 0 then raise exception 'Invalid revision' using errcode = '22023'; end if;
  if p_revision = 0 then
    insert into public.projects(owner_id, id, content) values (v_owner, p_id, p_content)
      on conflict (owner_id, id) do nothing returning * into v_project;
  else
    update public.projects set content = p_content, revision = revision + 1, updated_at = clock_timestamp()
      where owner_id = v_owner and id = p_id and revision = p_revision
      returning * into v_project;
  end if;
  if v_project.id is null then raise exception 'Project changed or unavailable' using errcode = 'PT409'; end if;
  return next v_project;
end;
$$;

create function public.delete_project(p_id text, p_revision integer, p_owner uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_owner is distinct from auth.uid() then raise exception 'Authentication required' using errcode = '42501'; end if;
  delete from public.projects where owner_id = auth.uid() and id = p_id and revision = p_revision;
  if not found then raise exception 'Project changed or unavailable' using errcode = 'PT409'; end if;
end;
$$;
revoke all on function public.save_project(text, jsonb, integer, uuid) from public, anon;
revoke all on function public.delete_project(text, integer, uuid) from public, anon;
grant execute on function public.save_project(text, jsonb, integer, uuid) to authenticated;
grant execute on function public.delete_project(text, integer, uuid) to authenticated;
commit;
