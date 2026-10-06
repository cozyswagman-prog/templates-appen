// Offline control-state backup. No CLI, credentials, cloud clients or live restore.
const fs = require('node:fs'), path = require('node:path');
const { createHash } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { ClosureJobStore, normalizeScope } = require('./account-closure-jobs.cjs');
const { normalizeClosures } = require('./backup-closures.cjs');
const ROOT = path.resolve(__dirname, '..');
const FORMAT = 'templates-closure-control-v1';
const MAX_BYTES = 64 * 1024 * 1024;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const sha = b => createHash('sha256').update(b).digest('hex');
const fail = code => { throw new Error(code); };
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const integer = (n,min=0) => Number.isSafeInteger(n) && n >= min && n < Number.MAX_SAFE_INTEGER - 2;
function keys(value, fields) {
  if (!value || typeof value !== 'object' || !same(Object.keys(value).sort(),fields.split(',').sort())) fail('INVALID_CONTROL_STATE');
}
function rows(value, fields, identity, validate) {
  if (!Array.isArray(value) || value.length > 100000) fail('INVALID_CONTROL_STATE');
  const ids = new Set();
  for (const r of value) {
    keys(r,fields); validate(r);
    const id = identity(r);
    if (ids.has(id)) fail('DUPLICATE_CONTROL_ROW');
    ids.add(id);
  }
  return [...value].sort((a,b) => String(identity(a)).localeCompare(String(identity(b))));
}
function schemas() {
  const names = ['tools/account-closure-jobs.cjs', 'server/schema.sql',
    'server/proposals/account-closure-publication.sql',
    'supabase/proposals/account-closure.sql', 'supabase/proposals/account-closure-execution.sql',
    ...fs.readdirSync(path.join(ROOT,'supabase/migrations')).sort().map(n=>'supabase/migrations/'+n)];
  return names.map(name=>({name,sha256:sha(fs.readFileSync(path.join(ROOT,name),'utf8').replace(/\r\n/g,'\n'))}));
}
function normalize(data) {
  data=JSON.parse(JSON.stringify(data)); // No mutable references survive an asynchronous capture/restore.
  keys(data,'jobs,events,accountClosures,privateExecutions,publicationClosures,closedSites');
  const jobs = rows(data.jobs,'id,owner_id,scope,scope_hash,step,status,fence,attempts,lease_until,retry_at,error_code,created_at,updated_at',r=>r.owner_id,r=>{
    if (!UUID.test(r.id) || !UUID.test(r.owner_id) || typeof r.scope !== 'string' || sha(r.scope)!==r.scope_hash ||
        r.scope !== JSON.stringify(normalizeScope(r.owner_id,JSON.parse(r.scope))) ||
        ![r.step,r.fence,r.attempts,r.lease_until,r.retry_at,r.created_at,r.updated_at].every(n=>integer(n)) || r.step>6 ||
        !['pending','running','retry','blocked','complete'].includes(r.status) ||
        (r.status==='complete') !== (r.step===6) ||
        ![null,'STEP_FAILED','GUARD_REQUIRED','SCOPE_CHANGED','UNVERIFIED_RESULT','ATTEMPTS_EXHAUSTED','RESTORE_REVIEW_REQUIRED'].includes(r.error_code)) fail('INVALID_JOB');
  });
  const byOwner = new Map(jobs.map(r=>[r.owner_id,r])), byId = new Map(jobs.map(r=>[r.id,r]));
  if (byId.size!==jobs.length) fail('DUPLICATE_JOB');
  const events = rows(data.events,'sequence,job_id,step,fence,kind,at',r=>r.sequence,r=>{
    const job=byId.get(r.job_id);
    if (!job || !integer(r.sequence,1) || !integer(r.step) || r.step>6 || !integer(r.fence) || r.fence>job.fence || !integer(r.at) ||
        !['created','claimed','attempts_exhausted','verified','blocked','retry','reviewed_resume','restored_blocked'].includes(r.kind)) fail('INVALID_JOB_EVENT');
  });
  rows(data.accountClosures,'owner_id,started_at',r=>r.owner_id,()=>{});
  const accountClosures = normalizeClosures(data.accountClosures);
  const privateOwners = new Set(accountClosures.map(r=>r.owner_id));
  function bound(r) {
    const job = byOwner.get(r.owner_id);
    if (!job || r.job_id!==job.id || r.scope_hash!==job.scope_hash || !integer(r.fence,1)) fail('CONTROL_BINDING_MISMATCH');
    return JSON.parse(job.scope);
  }
  const privateExecutions = rows(data.privateExecutions,'owner_id,job_id,scope_hash,fence,projects,objects',r=>r.owner_id,r=>{
    const scope=bound(r);
    if (!privateOwners.has(r.owner_id) || !same(r.projects,scope.projectIds) || !same(r.objects,scope.storageObjects)) fail('PRIVATE_GUARD_MISMATCH');
  });
  const publicationClosures = rows(data.publicationClosures,'owner_id,job_id,scope_hash,fence,site_ids',r=>r.owner_id,r=>{
    if (typeof r.site_ids!=='string' || !same(JSON.parse(r.site_ids),bound(r).siteIds)) fail('PUBLICATION_GUARD_MISMATCH');
  });
  const expectedSites = publicationClosures.flatMap(r=>JSON.parse(r.site_ids).map(site_id=>({site_id,owner_id:r.owner_id})));
  const closedSites = rows(data.closedSites,'site_id,owner_id',r=>r.site_id,r=>{
    if (!expectedSites.some(s=>s.site_id===r.site_id && s.owner_id===r.owner_id)) fail('SITE_GUARD_MISMATCH');
  });
  if (expectedSites.length!==closedSites.length) fail('SITE_GUARD_MISMATCH');
  for (const j of jobs) if (j.step>0 && (!privateExecutions.some(r=>r.owner_id===j.owner_id) || !publicationClosures.some(r=>r.owner_id===j.owner_id))) fail('MISSING_COMPLETED_FREEZE');
  return {jobs,events,accountClosures,privateExecutions,publicationClosures,closedSites};
}
function seal(source,started,created,data) {
  return {format:FORMAT,source,started,created,schemas:schemas(),coverage:'CAPTURED_AS_OF_BACKUP',data:normalize(data)};
}
function validate(payload) {
  payload=JSON.parse(JSON.stringify(payload));
  keys(payload,'format,source,started,created,schemas,coverage,data');
  keys(payload.source,'jobs,private,publication');
  if (Object.values(payload.source).some(v=>typeof v!=='string' || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(v)) ||
      payload.format!==FORMAT || payload.coverage!=='CAPTURED_AS_OF_BACKUP' ||
      ![payload.started,payload.created].every(v=>typeof v==='string' && /^\d{4}-\d\d-\d\dT.*Z$/.test(v) && Number.isFinite(Date.parse(v))) ||
      Date.parse(payload.started)>Date.parse(payload.created)) fail('INVALID_CONTROL_BACKUP');
  if (!same(payload.schemas,schemas())) fail('CONTROL_SCHEMA_CHANGED');
  return {...payload,data:normalize(payload.data)};
}
function snapshotJobs(store) {
  return store.transaction(()=>({
    jobs:store.db.prepare('select * from closure_jobs_v1 order by owner_id').all(),
    events:store.db.prepare('select * from closure_job_events_v1 order by sequence').all()
  }));
}
async function snapshotPrivate(pg) {
  return pg.transaction(async tx=>({
    accountClosures:(await tx.query("select owner_id,to_char(started_at at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') started_at from public.account_closures order by owner_id")).rows,
    privateExecutions:(await tx.query('select owner_id,job_id,scope_hash,fence,projects,objects from public.account_closure_execution order by owner_id')).rows
  }));
}
function snapshotPublication(db) {
  db.exec('begin');
  try {
    const result={publicationClosures:db.prepare('select owner_id,job_id,scope_hash,fence,site_ids from publication_closures order by owner_id').all(),
      closedSites:db.prepare('select site_id,owner_id from closed_publication_sites order by site_id').all()};
    db.exec('commit');return result;
  } catch(e){db.exec('rollback');throw e;}
}
async function capture({mode,source,jobs,readPrivate,readPublication}) {
  if (mode!=='local-rehearsal') fail('LOCAL_MODE_REQUIRED');
  try {
    const read = async()=>{
      const jobData=snapshotJobs(jobs),privateData=await readPrivate(),publicationData=await readPublication();
      keys(privateData,'accountClosures,privateExecutions');keys(publicationData,'publicationClosures,closedSites');
      return normalize({...jobData,...privateData,...publicationData});
    };
    const started=new Date().toISOString(), first=await read(), second=await read();
    if (!same(first,second)) fail('CONTROL_CAPTURE_CHANGED');
    return validate(seal(source,started,new Date().toISOString(),second));
  } catch (e) {
    if (e.message==='CONTROL_CAPTURE_CHANGED') throw e;
    fail('CONTROL_CAPTURE_FAILED'); // Never return raw database/provider errors.
  }
}
function merge(base,newer) {
  base=validate(base); newer=validate(newer);
  if (!same(base.source,newer.source) || Date.parse(newer.started)<Date.parse(base.created)) fail('BACKUP_SOURCE_OR_TIME_MISMATCH');
  function union(name,id,combine) {
    const values=new Map(base.data[name].map(r=>[id(r),r]));
    for (const r of newer.data[name]) values.set(id(r),values.has(id(r))?combine(values.get(id(r)),r):r);
    return [...values.values()];
  }
  const bound=(a,b)=>{
    if (a.job_id!==b.job_id || a.scope_hash!==b.scope_hash || b.fence<a.fence) fail('CONTROL_HISTORY_CONFLICT');
    return b;
  };
  const data={
    jobs:union('jobs',r=>r.owner_id,(a,b)=>{
      if (a.id!==b.id || a.scope!==b.scope || a.scope_hash!==b.scope_hash || b.fence<a.fence) fail('CONTROL_HISTORY_CONFLICT');
      return b;
    }),
    events:union('events',r=>r.sequence,(a,b)=>{if(!same(a,b))fail('CONTROL_HISTORY_CONFLICT');return b;}),
    accountClosures:union('accountClosures',r=>r.owner_id,(a,b)=>Date.parse(a.started_at)<Date.parse(b.started_at)?a:b),
    privateExecutions:union('privateExecutions',r=>r.owner_id,bound),
    publicationClosures:union('publicationClosures',r=>r.owner_id,bound),
    closedSites:union('closedSites',r=>r.site_id,(a,b)=>{if(a.owner_id!==b.owner_id)fail('CONTROL_HISTORY_CONFLICT');return b;})
  };
  return seal(base.source,base.started,newer.created,data);
}
function safePath(filename,writing=false) {
  const full=path.resolve(filename);
  for(let p=full;;p=path.dirname(p)) {
    if(fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) fail('CONTROL_PATH_LINK');
    if(writing && fs.existsSync(path.join(p,'.git'))) fail('CONTROL_OUTPUT_IN_GIT');
    if(path.dirname(p)===p)break;
  }
  return full;
}
function save(filename,payload) {
  payload=validate(payload);
  const bytes=Buffer.from(JSON.stringify({sha256:sha(JSON.stringify(payload)),payload})+'\n');
  if(bytes.length>MAX_BYTES)fail('CONTROL_BACKUP_TOO_LARGE');
  fs.writeFileSync(safePath(filename,true),bytes,{flag:'wx',mode:0o600});
}
function load(filename) {
  const full=safePath(filename),stat=fs.lstatSync(full);
  if(!stat.isFile() || stat.size>MAX_BYTES)fail('INVALID_CONTROL_FILE');
  const envelope=JSON.parse(fs.readFileSync(full,'utf8'));
  keys(envelope,'sha256,payload');
  if(sha(JSON.stringify(envelope.payload))!==envelope.sha256)fail('CONTROL_INTEGRITY_FAILED');
  return validate(envelope.payload);
}
async function restoreLocal(payload,directory,{mode}={}) {
  if(mode!=='local-rehearsal')fail('LOCAL_MODE_REQUIRED');
  // Own fresh databases only. Never accept an injected live restore destination.
  payload=validate(payload);
  const fences=new Map(payload.data.jobs.map(r=>[r.owner_id,Math.max(r.fence,
    ...payload.data.privateExecutions.filter(x=>x.owner_id===r.owner_id).map(x=>x.fence),
    ...payload.data.publicationClosures.filter(x=>x.owner_id===r.owner_id).map(x=>x.fence))+1]));
  const dir=safePath(directory,true);
  fs.mkdirSync(dir,{mode:0o700}); // Existing directories and parents are never overwritten.
  let pg,db,jobs;
  try {
    save(path.join(dir,'control-backup.json'),payload);
    fs.writeFileSync(path.join(dir,'INCOMPLETE'),'LOCAL_RESTORE_NOT_COMPLETE\n',{flag:'wx'});
    const {PGlite}=require('@electric-sql/pglite');
    pg=new PGlite(path.join(dir,'private'));
    await pg.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
      create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated;
      create schema storage;grant usage on schema storage to anon,authenticated,service_role;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(bucket_id text references storage.buckets(id),name text,primary key(bucket_id,name));
      alter table storage.objects enable row level security;
      grant select,insert,update,delete on storage.objects to anon,authenticated;`);
    for(const f of payload.schemas.filter(r=>r.name.startsWith('supabase/migrations/')))await pg.exec(fs.readFileSync(path.join(ROOT,f.name),'utf8'));
    for(const f of ['account-closure.sql','account-closure-execution.sql'])await pg.exec(fs.readFileSync(path.join(ROOT,'supabase/proposals',f),'utf8'));
    await pg.transaction(async tx=>{
      for(const r of payload.data.accountClosures)await tx.query('insert into public.account_closures values($1,$2)',[r.owner_id,r.started_at]);
      for(const r of payload.data.privateExecutions)await tx.query('insert into public.account_closure_execution values($1,$2,$3,$4,$5,$6)',[r.owner_id,r.job_id,r.scope_hash,fences.get(r.owner_id),JSON.stringify(r.projects),JSON.stringify(r.objects)]);
    });
    db=new DatabaseSync(path.join(dir,'publication.sqlite'));
    db.exec('pragma foreign_keys=on;'+fs.readFileSync(path.join(ROOT,'server/schema.sql'),'utf8'));
    db.exec(fs.readFileSync(path.join(ROOT,'server/proposals/account-closure-publication.sql'),'utf8'));
    db.exec('begin immediate');
    for(const r of payload.data.publicationClosures)db.prepare('insert into publication_closures values(?,?,?,?,?)').run(r.owner_id,r.job_id,r.scope_hash,fences.get(r.owner_id),r.site_ids);
    // The actual SQL trigger rebuilds reserved site IDs. Check rather than bypass it.
    const sites=db.prepare('select site_id,owner_id from closed_publication_sites order by site_id').all();
    if(sites.length!==payload.data.closedSites.length || sites.some(r=>!payload.data.closedSites.some(s=>s.site_id===r.site_id && s.owner_id===r.owner_id)))fail('SITE_RESTORE_FAILED');
    db.exec('commit');
    jobs=new ClosureJobStore(path.join(dir,'jobs.sqlite'),{mode});
    jobs.transaction(()=>{
      for(const r of payload.data.jobs) {
        const fence=fences.get(r.owner_id);
        jobs.db.prepare(`insert into closure_jobs_v1(id,owner_id,scope,scope_hash,step,status,fence,attempts,lease_until,retry_at,error_code,created_at,updated_at)
          values(?,?,?,?,0,'blocked',?,0,0,0,'RESTORE_REVIEW_REQUIRED',?,?)`).run(r.id,r.owner_id,r.scope,r.scope_hash,fence,r.created_at,Date.now());
      }
      for(const r of payload.data.events)jobs.db.prepare('insert into closure_job_events_v1 values(?,?,?,?,?,?)').run(r.sequence,r.job_id,r.step,r.fence,r.kind,r.at);
      for(const r of payload.data.jobs)jobs.event(jobs.read(r.id),'restored_blocked');
    });
    await pg.close();pg=null;db.close();db=null;jobs.close();jobs=null;
    const report={status:'LOCAL_RESTORE_REVIEW_REQUIRED',asOf:payload.created,counts:Object.fromEntries(Object.entries(payload.data).map(([k,v])=>[k,v.length])),liveRestoreApproved:false};
    fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    fs.unlinkSync(path.join(dir,'INCOMPLETE'));
    return report;
  } catch { fail('LOCAL_CONTROL_RESTORE_FAILED'); }
  finally { if(pg)await pg.close();if(db)db.close();if(jobs)jobs.close(); }
}
module.exports={capture,snapshotJobs,snapshotPrivate,snapshotPublication,merge,save,load,restoreLocal};
