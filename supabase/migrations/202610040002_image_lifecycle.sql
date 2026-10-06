-- Local preparation only. Apply after both earlier migrations in an approved test project.
-- Physical deletion is exclusively through the Storage API, never DELETE storage.objects.
begin;
alter table public.project_images drop constraint project_images_name_check;
alter table public.project_images add constraint project_images_name_check
  check (name ~ '^[a-f0-9]{64}(-[a-f0-9]{32})?\.(png|jpeg|webp|gif)$');
alter table public.project_images
  add column content_key text,
  add column state text not null default 'active' check (state in ('active','deleting','deleted')),
  add column unused_since timestamptz default now(),
  add column lease_until timestamptz not null default (now() + interval '1 hour'),
  add column delete_token uuid,
  add column retry_after timestamptz,
  add column deleted_at timestamptz;
update public.project_images set content_key = name;
alter table public.project_images alter column content_key set not null;
alter table public.project_images add constraint image_content_key_valid
  check (content_key ~ '^[a-f0-9]{64}\.(png|jpeg|webp|gif)$');
create unique index images_active_content on public.project_images(owner_id,content_key) where state = 'active';
create index images_cleanup_due on public.project_images(unused_since,lease_until) where state = 'active';
create index images_cleanup_retry on public.project_images(retry_after) where state = 'deleting';

create table public.project_image_refs (
  owner_id uuid not null,
  project_id text not null,
  image_name text not null,
  primary key(owner_id,project_id,image_name),
  foreign key(owner_id,project_id) references public.projects(owner_id,id) on delete cascade,
  foreign key(owner_id,image_name) references public.project_images(owner_id,name)
);
create index project_image_refs_image on public.project_image_refs(owner_id,image_name);
alter table public.project_image_refs enable row level security;
alter table public.project_image_refs force row level security;
revoke all on public.project_image_refs from public,anon,authenticated;

-- Conservative extraction: every complete image reference anywhere in the JSON
-- counts as use. Malformed reserved references block saving rather than risk deletion.
create function public.project_image_names(p_content jsonb) returns setof text
language sql immutable set search_path = '' as $$
  select distinct substring(value #>> '{}' from 20)
  from pg_catalog.jsonb_path_query(p_content, 'strict $.** ? (@.type() == "string")') value
  where left(value #>> '{}',19) = 'templates-image:v1:';
$$;
-- The prefix has 19 characters including the final colon.
revoke all on function public.project_image_names(jsonb) from public,anon,authenticated;
insert into public.project_image_refs(owner_id,project_id,image_name)
  select p.owner_id,p.id,n from public.projects p cross join lateral public.project_image_names(p.content) n;
update public.project_images i set unused_since = null
  where exists(select 1 from public.project_image_refs r where r.owner_id=i.owner_id and r.image_name=i.name);

create function public.sync_project_image_refs() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor uuid; image_name text;
begin
  actor := case when tg_op='DELETE' then old.owner_id else new.owner_id end;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,1042026));
  if tg_op='UPDATE' and (old.owner_id,old.id) is distinct from (new.owner_id,new.id) then
    raise exception 'Project identity is immutable' using errcode='23514';
  end if;
  if tg_op <> 'DELETE' then
    delete from public.project_image_refs where owner_id=actor and project_id=new.id;
    for image_name in select public.project_image_names(new.content) loop
      if not exists(select 1 from public.project_images i where i.owner_id=actor and i.name=image_name and i.state='active')
        or not exists(select 1 from storage.objects o where o.bucket_id='project-images' and o.name=actor::text || '/' || image_name) then
        raise exception 'Image unavailable; prepare and upload again' using errcode='PT410';
      end if;
      insert into public.project_image_refs values(actor,new.id,image_name);
    end loop;
  else
    delete from public.project_image_refs where owner_id=actor and project_id=old.id;
  end if;
  update public.project_images i set unused_since=null where i.owner_id=actor and i.state='active'
    and exists(select 1 from public.project_image_refs r where r.owner_id=actor and r.image_name=i.name);
  update public.project_images i set unused_since=clock_timestamp() where i.owner_id=actor and i.state='active' and i.unused_since is null
    and not exists(select 1 from public.project_image_refs r where r.owner_id=actor and r.image_name=i.name);
  return null;
end;
$$;
revoke all on function public.sync_project_image_refs() from public,anon,authenticated;
create trigger project_image_refs_sync after insert or update or delete on public.projects
  for each row execute function public.sync_project_image_refs();

-- Acquire the owner lock BEFORE project tuple locks; keep the original revision logic.
alter function public.save_project(text,jsonb,integer,uuid) rename to save_project_before_images;
alter function public.delete_project(text,integer,uuid) rename to delete_project_before_images;
revoke all on function public.save_project_before_images(text,jsonb,integer,uuid) from public,anon,authenticated,service_role;
revoke all on function public.delete_project_before_images(text,integer,uuid) from public,anon,authenticated,service_role;
create function public.save_project(p_id text,p_content jsonb,p_revision integer,p_owner uuid)
returns setof public.projects language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or p_owner is distinct from auth.uid() then raise exception 'Authentication changed' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,1042026));
  return query select * from public.save_project_before_images(p_id,p_content,p_revision,p_owner);
end;
$$;
create function public.delete_project(p_id text,p_revision integer,p_owner uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or p_owner is distinct from auth.uid() then raise exception 'Authentication changed' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,1042026));
  perform public.delete_project_before_images(p_id,p_revision,p_owner);
end;
$$;
revoke all on function public.save_project(text,jsonb,integer,uuid) from public,anon;
revoke all on function public.delete_project(text,integer,uuid) from public,anon;
grant execute on function public.save_project(text,jsonb,integer,uuid) to authenticated;
grant execute on function public.delete_project(text,integer,uuid) to authenticated;

drop function public.reserve_project_image(text,uuid);
create function public.reserve_project_image(p_name text,p_owner uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); actual_name text;
begin
  if actor is null or p_owner is distinct from actor then raise exception 'Authentication changed' using errcode='42501'; end if;
  if p_name is null or p_name !~ '^[a-f0-9]{64}\.(png|jpeg|webp|gif)$' then raise exception 'Invalid image name' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,1042026));
  select name into actual_name from public.project_images where owner_id=actor and content_key=p_name and state='active';
  if actual_name is null then
    if (select count(*) from public.project_images where owner_id=actor and state<>'deleted') >=100 then
      raise exception 'Image quota reached' using errcode='PT413';
    end if;
    actual_name := split_part(p_name,'.',1) || '-' || replace(pg_catalog.gen_random_uuid()::text,'-','') || '.' || split_part(p_name,'.',2);
    insert into public.project_images(owner_id,name,content_key) values(actor,actual_name,p_name);
  end if;
  update public.project_images set lease_until=clock_timestamp()+interval '1 hour'
    where owner_id=actor and name=actual_name;
  return jsonb_build_object('name',actual_name,'uploaded',exists(select 1 from storage.objects where bucket_id='project-images' and name=actor::text || '/' || actual_name));
end;
$$;
revoke all on function public.reserve_project_image(text,uuid) from public,anon;
grant execute on function public.reserve_project_image(text,uuid) to authenticated;

-- Serialize Storage metadata insertion with cleanup; a retired path cannot reappear.
create function public.project_image_upload_allowed(p_path text) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null or split_part(p_path,'/',1)<>actor::text then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,1042026));
  return exists(select 1 from public.project_images i where i.owner_id=actor and p_path=actor::text || '/' || i.name
    and i.state='active' and i.lease_until>clock_timestamp());
end;
$$;
revoke all on function public.project_image_upload_allowed(text) from public,anon;
grant execute on function public.project_image_upload_allowed(text) to authenticated;
drop policy templates_images_insert on storage.objects;
create policy templates_images_insert on storage.objects for insert to authenticated
  with check(bucket_id='project-images' and public.project_image_upload_allowed(name));

create function public.preview_project_image_cleanup(p_limit integer default 20)
returns table(owner_id uuid,name text,delete_token uuid)
language plpgsql security definer set search_path='' as $$
begin
  if p_limit is null or p_limit not between 1 and 25 then raise exception 'Invalid batch size' using errcode='22023'; end if;
  return query select i.owner_id,i.name,i.delete_token from public.project_images i
    where ((i.state='active' and i.unused_since < clock_timestamp()-interval '7 days' and i.lease_until < clock_timestamp())
      or (i.state='deleting' and i.retry_after < clock_timestamp()))
      and not exists(select 1 from public.project_image_refs r where r.owner_id=i.owner_id and r.image_name=i.name)
    order by i.owner_id,i.name limit p_limit;
end;
$$;
create function public.claim_project_image_cleanup(p_limit integer default 20)
returns table(owner_id uuid,name text,delete_token uuid)
language plpgsql security definer set search_path='' as $$
declare candidate record;
begin
  for candidate in select * from public.preview_project_image_cleanup(p_limit) loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(candidate.owner_id::text,1042026));
    -- Recheck after locking: a save/reservation may have won while we waited.
    return query update public.project_images i set state='deleting',
      delete_token=coalesce(i.delete_token,pg_catalog.gen_random_uuid()),retry_after=clock_timestamp()+interval '15 minutes'
      where i.owner_id=candidate.owner_id and i.name=candidate.name
        and ((i.state='active' and i.unused_since < clock_timestamp()-interval '7 days' and i.lease_until < clock_timestamp())
          or (i.state='deleting' and i.retry_after < clock_timestamp()))
        and not exists(select 1 from public.project_image_refs r where r.owner_id=i.owner_id and r.image_name=i.name)
      returning i.owner_id,i.name,i.delete_token;
  end loop;
end;
$$;
create function public.finish_project_image_cleanup(p_owner uuid,p_name text,p_token uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,1042026));
  if not exists(select 1 from public.project_images where owner_id=p_owner and name=p_name and delete_token=p_token and state in ('deleting','deleted')) then
    raise exception 'Cleanup claim does not match' using errcode='PT409';
  end if;
  if exists(select 1 from storage.objects where bucket_id='project-images' and name=p_owner::text || '/' || p_name)
    or exists(select 1 from public.project_image_refs where owner_id=p_owner and image_name=p_name) then
    return false;
  end if;
  update public.project_images set state='deleted',deleted_at=coalesce(deleted_at,clock_timestamp()),retry_after=null
    where owner_id=p_owner and name=p_name and delete_token=p_token;
  return true;
end;
$$;
revoke all on function public.preview_project_image_cleanup(integer) from public,anon,authenticated;
revoke all on function public.claim_project_image_cleanup(integer) from public,anon,authenticated;
revoke all on function public.finish_project_image_cleanup(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.preview_project_image_cleanup(integer) to service_role;
grant execute on function public.claim_project_image_cleanup(integer) to service_role;
grant execute on function public.finish_project_image_cleanup(uuid,text,uuid) to service_role;
commit;
