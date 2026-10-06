-- Proposal only, after account-closure.sql. Never an automatic migration.
-- Physical Storage/Auth deletion belongs to their APIs, never to these RPCs.
begin;
create table public.account_closure_execution (
  owner_id uuid primary key, job_id uuid not null unique,
  scope_hash text not null check(scope_hash ~ '^[a-f0-9]{64}$'),
  fence bigint not null check(fence>0),
  projects jsonb not null check(jsonb_typeof(projects)='array'),
  objects jsonb not null check(jsonb_typeof(objects)='array')
);
alter table public.account_closure_execution enable row level security;
alter table public.account_closure_execution force row level security;
revoke all on public.account_closure_execution from public,anon,authenticated,service_role;
grant select on public.account_closure_execution to service_role;

create function public.assert_closure_execution(p_owner uuid,p_job uuid,p_hash text,p_fence bigint)
returns void language plpgsql security definer set search_path='' as $$
declare r public.account_closure_execution;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,1042026));
  select * into r from public.account_closure_execution where owner_id=p_owner;
  if not found or r.job_id is distinct from p_job or r.scope_hash is distinct from p_hash or r.fence is distinct from p_fence
    then raise exception 'Closure job changed' using errcode='PT409'; end if;
  if not exists(select 1 from public.account_closures where owner_id=p_owner)
    then raise exception 'Closure guard missing' using errcode='PT423'; end if;
  if exists(select 1 from public.projects where owner_id=p_owner and not (r.projects ? id))
    or exists(select 1 from public.project_images where owner_id=p_owner and not (r.objects ? (p_owner::text||'/'||name)))
    or exists(select 1 from storage.objects where bucket_id='project-images'
      and left(name,length(p_owner::text)+1)=p_owner::text||'/' and not (r.objects ? name))
    then raise exception 'Closure scope changed' using errcode='PT422'; end if;
end;
$$;
revoke all on function public.assert_closure_execution(uuid,uuid,text,bigint) from public,anon,authenticated,service_role;

create function public.closure_execution_state(p_owner uuid,p_job uuid,p_hash text,p_fence bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform public.assert_closure_execution(p_owner,p_job,p_hash,p_fence);
  return jsonb_build_object('jobId',p_job,'ownerId',p_owner,'scopeHash',p_hash,'fence',p_fence,
    'privateWritesBlocked',true,
    'authPresent',exists(select 1 from auth.users where id=p_owner),
    'objects',coalesce((select jsonb_agg(name order by name) from storage.objects where bucket_id='project-images'
      and left(name,length(p_owner::text)+1)=p_owner::text||'/'),'[]'::jsonb),
    'counts',jsonb_build_object(
      'projects',(select count(*) from public.projects where owner_id=p_owner),
      'images',(select count(*) from public.project_images where owner_id=p_owner),
      'refs',(select count(*) from public.project_image_refs where owner_id=p_owner),
      'objects',(select count(*) from storage.objects where bucket_id='project-images' and left(name,length(p_owner::text)+1)=p_owner::text||'/')));
end;
$$;
revoke all on function public.closure_execution_state(uuid,uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.closure_execution_state(uuid,uuid,text,bigint) to service_role;

create function public.claim_closure_execution(p_owner uuid,p_job uuid,p_hash text,p_fence bigint,p_projects jsonb,p_objects jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.account_closure_execution;
begin
  if p_owner is null or p_job is null or p_hash is null or p_hash !~ '^[a-f0-9]{64}$'
    or p_fence is null or p_fence<1 or p_fence>9007199254740991
    or jsonb_typeof(p_projects) is distinct from 'array' or jsonb_typeof(p_objects) is distinct from 'array'
    then raise exception 'Invalid closure scope' using errcode='22023'; end if;
  if jsonb_array_length(p_projects)>10000 or jsonb_array_length(p_objects)>10000
    or exists(select 1 from jsonb_array_elements(p_projects) v where jsonb_typeof(v)<>'string' or (v#>>'{}') !~ '^[a-zA-Z0-9_-]{1,100}$')
    or exists(select 1 from jsonb_array_elements(p_objects) v where jsonb_typeof(v)<>'string'
      or (v#>>'{}') !~ ('^'||p_owner::text||'/[a-f0-9]{64}(-[a-f0-9]{32})?\.(png|jpeg|webp|gif)$'))
    or (select count(distinct value) from jsonb_array_elements(p_projects))<>jsonb_array_length(p_projects)
    or (select count(distinct value) from jsonb_array_elements(p_objects))<>jsonb_array_length(p_objects)
    then raise exception 'Invalid closure scope' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,1042026));
  select * into r from public.account_closure_execution where owner_id=p_owner;
  if found then
    if r.job_id<>p_job or r.scope_hash<>p_hash or r.projects<>p_projects or r.objects<>p_objects or r.fence>p_fence
      then raise exception 'Closure job changed' using errcode='PT409'; end if;
    update public.account_closure_execution set fence=p_fence where owner_id=p_owner;
  else
    insert into public.account_closure_execution values(p_owner,p_job,p_hash,p_fence,p_projects,p_objects);
  end if;
  -- Job binding and persistent private guard commit or roll back together.
  perform public.begin_account_closure(p_owner);
  return public.closure_execution_state(p_owner,p_job,p_hash,p_fence);
end;
$$;
revoke all on function public.claim_closure_execution(uuid,uuid,text,bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.claim_closure_execution(uuid,uuid,text,bigint,jsonb,jsonb) to service_role;

create function public.erase_closed_projects(p_owner uuid,p_job uuid,p_hash text,p_fence bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform public.assert_closure_execution(p_owner,p_job,p_hash,p_fence);
  if exists(select 1 from storage.objects where bucket_id='project-images' and left(name,length(p_owner::text)+1)=p_owner::text||'/')
    then raise exception 'Storage deletion required' using errcode='PT409'; end if;
  delete from public.projects where owner_id=p_owner;
  delete from public.project_images where owner_id=p_owner;
  return public.closure_execution_state(p_owner,p_job,p_hash,p_fence);
end;
$$;
revoke all on function public.erase_closed_projects(uuid,uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.erase_closed_projects(uuid,uuid,text,bigint) to service_role;
commit;
