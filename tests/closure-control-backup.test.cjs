const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createHash}=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {PGlite}=require('@electric-sql/pglite');
const {ClosureJobStore,runNext}=require('../tools/account-closure-jobs.cjs');
const {capture,snapshotJobs,snapshotPrivate,snapshotPublication,merge,save,load,restoreLocal}=require('../tools/closure-control-backup.cjs');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333';
const mode='local-rehearsal',source={jobs:'synthetic-jobs',private:'synthetic-private',publication:'synthetic-d1'};
const clone=v=>JSON.parse(JSON.stringify(v));
function fixture(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'templates-control-backup-'));
  const jobs=new ClosureJobStore(path.join(dir,'source.sqlite'),{mode});
  t.after(()=>{jobs.close();fs.rmSync(dir,{recursive:true,force:true});});
  const scope={projectIds:['shared'],siteIds:['site-a'],storageObjects:[A+'/'+'a'.repeat(64)+'.gif']};
  const job=jobs.create({ownerId:A,scope,reviewed:true});
  jobs.claim(job.id);
  const b=jobs.create({ownerId:B,scope:{projectIds:['shared'],siteIds:['site-b'],storageObjects:[]},reviewed:true});
  const privateData={accountClosures:[{owner_id:A,started_at:'2026-10-06T10:00:00.000000Z'}],privateExecutions:[{owner_id:A,job_id:job.id,scope_hash:job.scopeHash,fence:7,projects:scope.projectIds,objects:scope.storageObjects}]};
  const publicData={publicationClosures:[{owner_id:A,job_id:job.id,scope_hash:job.scopeHash,fence:5,site_ids:JSON.stringify(scope.siteIds)}],closedSites:[{site_id:'site-a',owner_id:A}]};
  const options={mode,source,jobs,readPrivate:async()=>clone(privateData),readPublication:async()=>clone(publicData)};
  return {dir,jobs,job,b,privateData,publicData,options,backup:()=>capture(options)};
}
function writeEnvelope(file,payload) {
  fs.writeFileSync(file,JSON.stringify({sha256:createHash('sha256').update(JSON.stringify(payload)).digest('hex'),payload}));
}
test('Control bundle persists all six registries without modifying source and restores real guards before any account data',async t=>{
  const f=fixture(t),before=snapshotJobs(f.jobs),payload=await f.backup();
  const file=path.join(f.dir,'backup.json');save(file,payload);
  assert.deepEqual(load(file),payload);assert.deepEqual(snapshotJobs(f.jobs),before);
  const dest=path.join(f.dir,'restore'),report=await restoreLocal(load(file),dest,{mode});
  assert.equal(report.status,'LOCAL_RESTORE_REVIEW_REQUIRED');assert.equal(report.liveRestoreApproved,false);
  assert.equal(fs.existsSync(path.join(dest,'INCOMPLETE')),false);
  const pg=new PGlite(path.join(dest,'private')),db=new DatabaseSync(path.join(dest,'publication.sqlite'));
  const restored=new ClosureJobStore(path.join(dest,'jobs.sqlite'),{mode});
  try {
    const expectedPrivate=clone(f.privateData),expectedPublic=clone(f.publicData);
    expectedPrivate.privateExecutions[0].fence=8;expectedPublic.publicationClosures[0].fence=8;
    assert.deepEqual(await snapshotPrivate(pg),expectedPrivate);
    assert.deepEqual(clone(snapshotPublication(db)),expectedPublic);
    assert.equal((await pg.query('select count(*) n from auth.users')).rows[0].n,0);
    assert.equal(db.prepare('select count(*) n from sites').get().n,0);
    for(const id of [f.job.id,f.b.id]) {
      const r=restored.read(id);assert.equal(r.status,'blocked');assert.equal(r.step,0);
      assert.equal(r.errorCode,'RESTORE_REVIEW_REQUIRED');assert.equal(r.leaseUntil,0);
      assert.equal(restored.claim(id),null);assert.throws(()=>restored.resume(id,r.fence),/RESTORE_REVIEW_REQUIRED/);
      let called=0;const adapter=Object.fromEntries(['preflight','freeze','publication','storage','projects','auth','verify'].map(k=>[k,()=>{called++;}]));
      assert.equal((await runNext(restored,id,{mode,...adapter})).result,'NOT_CLAIMED');assert.equal(called,0);
    }
    assert.equal(restored.read(f.job.id).fence,8,'exceeds every captured service fence');
    assert.throws(()=>restored.assertLease(f.jobs.read(f.job.id)),/STALE_CLAIM/);
    assert.deepEqual(restored.events(f.job.id).slice(0,-1),f.jobs.events(f.job.id));
    // Even reintroducing an old Auth row cannot reopen its project/image writes.
    await pg.query('insert into auth.users values($1),($2)',[A,B]);
    await assert.rejects(pg.query('select public.assert_account_open($1)',[A]),{code:'PT423'});
    await pg.query('select public.assert_account_open($1)',[B]);
    await assert.rejects(pg.query('insert into storage.objects values($1,$2)',['project-images',A+'/'+'b'.repeat(64)+'.png']),{code:'PT423'});
    assert.throws(()=>db.prepare('insert into sites(id,host,owner_id) values(?,?,?)').run('site-a','a.test',B),/ACCOUNT_CLOSED/);
    assert.throws(()=>db.prepare('insert into sites(id,host,owner_id) values(?,?,?)').run('different-site','c.test',A),/ACCOUNT_CLOSED/);
    assert.throws(()=>db.prepare('insert into site_files values(?,?,?,?,?)').run('sites/site-a/v/old/x',Buffer.from('x'),1,'x','text/plain'),/ACCOUNT_CLOSED/);
    db.prepare('insert into sites(id,host,owner_id) values(?,?,?)').run('site-b','b.test',B);
    assert.equal(db.prepare('select owner_id from sites where id=?').get('site-b').owner_id,B);
    // Lower stored service fences are still rejected by the real proposal code.
    await assert.rejects(pg.query('select public.assert_closure_execution($1,$2,$3,$4)',[A,f.job.id,f.job.scopeHash,7]),{code:'PT409'});
    assert.throws(()=>db.prepare('update publication_closures set fence=5').run(),/CLOSURE_STALE_OR_CHANGED/);
    const recaptured=await capture({mode,source,jobs:restored,readPrivate:()=>snapshotPrivate(pg),readPublication:()=>snapshotPublication(db)});
    assert.equal(recaptured.data.jobs.find(j=>j.id===f.job.id).status,'blocked');
  } finally {await pg.close();db.close();restored.close();}
  assert.deepEqual(snapshotJobs(f.jobs),before);
});
test('Interrupted freeze can be backed up with one barrier; advanced checkpoints without both barriers fail',async t=>{
  const f=fixture(t);f.publicData.publicationClosures=[];f.publicData.closedSites=[];
  const partial=await f.backup();assert.equal(partial.data.privateExecutions.length,1);
  f.jobs.db.prepare("update closure_jobs_v1 set step=1,status='pending' where id=?").run(f.job.id);
  await assert.rejects(f.backup(),/CONTROL_CAPTURE_FAILED/);
});
test('Completed checkpoints restore blocked at freeze, never as proof of completion',async t=>{
  const f=fixture(t);f.jobs.db.prepare("update closure_jobs_v1 set step=6,status='complete',lease_until=0 where id=?").run(f.job.id);
  const p=await f.backup(),dest=path.join(f.dir,'done-restore');await restoreLocal(p,dest,{mode});
  const jobs=new ClosureJobStore(path.join(dest,'jobs.sqlite'),{mode});
  try {assert.equal(jobs.read(f.job.id).phase,'freeze');assert.equal(jobs.read(f.job.id).status,'blocked');}
  finally{jobs.close();}
  assert.equal(load(path.join(dest,'control-backup.json')).data.jobs.find(j=>j.id===f.job.id).status,'complete');
});
test('Changing jobs or services during capture fail without returning raw provider messages',async t=>{
  const f=fixture(t);let n=0;
  await assert.rejects(capture({...f.options,readPrivate:async()=>{const p=clone(f.privateData);p.privateExecutions[0].fence+=n++;return p;}}),/CONTROL_CAPTURE_CHANGED/);
  n=0;await assert.rejects(capture({...f.options,readPublication:async()=>{if(n++===0)f.jobs.db.prepare('update closure_jobs_v1 set fence=fence+1 where id=?').run(f.job.id);return clone(f.publicData);}}),/CONTROL_CAPTURE_CHANGED/);
  await assert.rejects(capture({...f.options,readPrivate:async()=>{throw Error('SECRET_PROVIDER_PAYLOAD');}}),e=>e.message==='CONTROL_CAPTURE_FAILED');
  await assert.rejects(capture({...f.options,mode:'production'}),/LOCAL_MODE_REQUIRED/);
});
test('Missing tables, orphan bindings, swapped owners, wrong scopes and missing site guards fail closed',async t=>{
  const f=fixture(t),p=await f.backup();
  const cases=[
    d=>delete d.privateExecutions,
    d=>d.jobs.splice(0,1),
    d=>d.privateExecutions[0].owner_id=B,
    d=>d.privateExecutions[0].projects=['other'],
    d=>d.accountClosures=[],
    d=>d.closedSites=[],
    d=>d.closedSites[0].owner_id=B,
    d=>d.publicationClosures[0].site_ids='["site-b"]',
    d=>d.jobs[0].scope_hash='f'.repeat(64),
    d=>d.jobs[0].error_code='PRIVATE_SERVICE_DETAIL',
    d=>d.events[0].kind='PRIVATE_SERVICE_DETAIL',
    d=>d.jobs.push(clone(d.jobs[0])),
    d=>d.publicationClosures[0].fence=Number.MAX_SAFE_INTEGER
  ];
  for(const mutate of cases){const v=clone(p);mutate(v.data);assert.throws(()=>save(path.join(f.dir,'invalid.json'),v));assert.equal(fs.existsSync(path.join(f.dir,'invalid.json')),false);}
  await assert.rejects(capture({...f.options,readPrivate:async()=>({...clone(f.privateData),jobs:[]})}),/CONTROL_CAPTURE_FAILED/);
});
test('Newer bundles union permanent guards, jobs and events; absence never reopens an old closed account',async t=>{
  const f=fixture(t),old=await f.backup(),newer=clone(old);
  newer.started=newer.created=new Date(Date.parse(old.created)+1000).toISOString();
  newer.data.jobs=[];newer.data.events=[];newer.data.privateExecutions=[];newer.data.publicationClosures=[];newer.data.closedSites=[];
  newer.data.accountClosures=[{owner_id:C,started_at:newer.created}];
  const result=merge(old,newer);
  assert.equal(result.data.accountClosures.length,2);assert.equal(result.data.jobs.length,2);
  assert.deepEqual(result.data.closedSites,old.data.closedSites);assert.deepEqual(result.data.events,old.data.events);
  const dest=path.join(f.dir,'union-restore');await restoreLocal(result,dest,{mode});
  const pg=new PGlite(path.join(dest,'private'));
  try{assert.equal((await snapshotPrivate(pg)).accountClosures.length,2);}finally{await pg.close();}
});
test('Different sources, reversed dates, changed binding and fence rollback cannot merge',async t=>{
  const f=fixture(t),p=await f.backup();
  for(const mutate of [v=>v.source.jobs='other',v=>v.started=v.created='2020-01-01T00:00:00Z',
    v=>v.data.privateExecutions[0].fence--,v=>v.data.publicationClosures[0].fence--,
    v=>v.data.events[0].at++,v=>{const id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';v.data.jobs[0].id=id;v.data.events.filter(e=>e.job_id===f.job.id).forEach(e=>e.job_id=id);v.data.privateExecutions[0].job_id=id;v.data.publicationClosures[0].job_id=id;}]) {
    const n=clone(p);n.started=n.created=new Date(Date.parse(p.created)+1000).toISOString();mutate(n);assert.throws(()=>merge(p,n));
  }
});
test('Corruption and schema drift stop before creating output, even with a recomputed envelope digest',async t=>{
  const f=fixture(t),p=await f.backup(),file=path.join(f.dir,'corrupt.json');save(file,p);
  const e=JSON.parse(fs.readFileSync(file));e.payload.data.jobs[0].fence++;fs.writeFileSync(file,JSON.stringify(e));
  assert.throws(()=>load(file),/CONTROL_INTEGRITY_FAILED/);
  const changed=clone(p);changed.schemas[0].sha256='a'.repeat(64);writeEnvelope(file,changed);
  assert.throws(()=>load(file),/CONTROL_SCHEMA_CHANGED/);
  await assert.rejects(restoreLocal(changed,path.join(f.dir,'invalid'),{mode}),/CONTROL_SCHEMA_CHANGED/);
  assert.equal(fs.existsSync(path.join(f.dir,'invalid')),false);
  const extras=clone(p);extras.serviceKey='NEVER_KEEP';writeEnvelope(file,extras);assert.throws(()=>load(file),/INVALID_CONTROL_STATE/);
});
test('Existing files/directories, Git output, symbolic links and production restore are refused',async t=>{
  const f=fixture(t),p=await f.backup(),file=path.join(f.dir,'existing.json');save(file,p);
  const before=fs.readFileSync(file);assert.throws(()=>save(file,p));assert.deepEqual(fs.readFileSync(file),before);
  await assert.rejects(restoreLocal(p,f.dir,{mode}));
  await assert.rejects(restoreLocal(p,path.join(f.dir,'prod'),{mode:'production'}),/LOCAL_MODE_REQUIRED/);
  const git=path.join(f.dir,'repo');fs.mkdirSync(git);fs.writeFileSync(path.join(git,'.git'),'gitdir: elsewhere');
  assert.throws(()=>save(path.join(git,'secret.json'),p),/CONTROL_OUTPUT_IN_GIT/);
  await assert.rejects(restoreLocal(p,path.join(git,'restore'),{mode}),/CONTROL_OUTPUT_IN_GIT/);
  const link=path.join(f.dir,'link');fs.symlinkSync(git,link,'junction');
  assert.throws(()=>save(path.join(link,'out.json'),p),/CONTROL_PATH_LINK/);
  assert.throws(()=>load(path.join(link,'existing.json')),/CONTROL_PATH_LINK/);
});
test('An interrupted restore stays explicitly incomplete and cannot be silently reused',async t=>{
  const f=fixture(t),p=await f.backup(),dest=path.join(f.dir,'partial');
  const original=fs.writeFileSync;
  fs.writeFileSync=function(file,...args){if(file===path.join(dest,'report.json'))throw Error('PRIVATE_DISK_ERROR');return original.call(this,file,...args);};
  try{await assert.rejects(restoreLocal(p,dest,{mode}),e=>e.message==='LOCAL_CONTROL_RESTORE_FAILED');}
  finally{fs.writeFileSync=original;}
  assert.equal(fs.existsSync(path.join(dest,'INCOMPLETE')),true);
  assert.equal(fs.existsSync(path.join(dest,'report.json')),false);
  const jobs=new ClosureJobStore(path.join(dest,'jobs.sqlite'),{mode});
  try{assert.equal(jobs.claim(f.job.id),null);assert.throws(()=>jobs.resume(f.job.id,jobs.read(f.job.id).fence),/RESTORE_REVIEW_REQUIRED/);}
  finally{jobs.close();}
  await assert.rejects(restoreLocal(p,dest,{mode}));
});
