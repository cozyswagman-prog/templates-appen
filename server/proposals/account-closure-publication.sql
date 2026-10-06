-- Proposal only: NOT part of schema.sql or automatic migrations.
-- Activate together with ACCOUNT_CLOSURE_ENABLED=1 on every Worker; D1 files only.
create table publication_closures (
  owner_id text primary key, job_id text not null, scope_hash text not null,
  fence integer not null check(fence > 0), site_ids text not null check(json_valid(site_ids))
);
create table closed_publication_sites (
  site_id text primary key, owner_id text not null references publication_closures(owner_id)
);
create index closed_publication_owner on closed_publication_sites(owner_id);

create trigger closure_scope_insert before insert on publication_closures begin
  select case when exists(select 1 from publication_closures c where c.owner_id=new.owner_id
    and (c.job_id<>new.job_id or c.scope_hash<>new.scope_hash or c.site_ids<>new.site_ids or c.fence>new.fence))
    then raise(abort,'CLOSURE_STALE_OR_CHANGED') end;
  select case when exists(select 1 from sites s where s.owner_id=new.owner_id
    and s.id not in (select value from json_each(new.site_ids)))
    or exists(select 1 from sites s where s.id in (select value from json_each(new.site_ids))
      and s.owner_id is not new.owner_id)
    or exists(select 1 from closed_publication_sites s where s.site_id in (select value from json_each(new.site_ids))
      and s.owner_id<>new.owner_id)
    then raise(abort,'CLOSURE_SCOPE_CHANGED') end;
end;
create trigger closure_scope_update before update on publication_closures
when new.owner_id<>old.owner_id or new.job_id<>old.job_id or new.scope_hash<>old.scope_hash
  or new.site_ids<>old.site_ids or new.fence<old.fence
begin select raise(abort,'CLOSURE_STALE_OR_CHANGED'); end;
create trigger closure_keep_owner before delete on publication_closures
begin select raise(abort,'CLOSURE_PERMANENT'); end;
create trigger closure_reserve_sites after insert on publication_closures begin
  insert or ignore into closed_publication_sites(site_id,owner_id) select value,new.owner_id from json_each(new.site_ids);
end;
create trigger closure_site_insert before insert on closed_publication_sites
when exists(select 1 from closed_publication_sites where site_id=new.site_id and owner_id<>new.owner_id)
begin select raise(abort,'CLOSURE_PERMANENT'); end;
create trigger closure_site_update before update on closed_publication_sites
begin select raise(abort,'CLOSURE_PERMANENT'); end;
create trigger closure_keep_site before delete on closed_publication_sites
begin select raise(abort,'CLOSURE_PERMANENT'); end;

create trigger closure_site_create before insert on sites
when exists(select 1 from publication_closures where owner_id=new.owner_id)
  or exists(select 1 from closed_publication_sites where site_id=new.id)
begin select raise(abort,'ACCOUNT_CLOSED'); end;
create trigger closure_site_change before update on sites
when exists(select 1 from publication_closures where owner_id in (old.owner_id,new.owner_id))
  or exists(select 1 from closed_publication_sites where site_id in (old.id,new.id))
begin select raise(abort,'ACCOUNT_CLOSED'); end;
create trigger closure_file_insert before insert on site_files
when exists(select 1 from closed_publication_sites where substr(new.key,1,length(site_id)+7)='sites/'||site_id||'/')
begin select raise(abort,'ACCOUNT_CLOSED'); end;
create trigger closure_file_update before update on site_files
when exists(select 1 from closed_publication_sites where substr(new.key,1,length(site_id)+7)='sites/'||site_id||'/'
  or substr(old.key,1,length(site_id)+7)='sites/'||site_id||'/')
begin select raise(abort,'ACCOUNT_CLOSED'); end;
create trigger closure_version_insert before insert on published_versions
when exists(select 1 from closed_publication_sites where site_id=new.site_id)
begin select raise(abort,'ACCOUNT_CLOSED'); end;
create trigger closure_version_update before update on published_versions
when exists(select 1 from closed_publication_sites where site_id in (old.site_id,new.site_id))
begin select raise(abort,'ACCOUNT_CLOSED'); end;
