// Disk-backed, synthetic services only. These tests never connect to the cloud.
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const { ClosureJobStore, runNext, binding } = require('../tools/account-closure-jobs.cjs');
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const image=n=>n.toString(16).padStart(64,'0')+'.png';
const scope={projectIds:['shared'],siteIds:['site-a'],storageObjects:[A+'/'+image(1),A+'/'+image(2)]};
function fixture(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'templates-closure-jobs-'));
  const jobs=path.join(dir,'jobs.sqlite'), services=path.join(dir,'services.sqlite');
  let now=10000;
  const options={mode:'local-rehearsal',now:()=>now,leaseMs:100,retryMs:10,maxAttempts:3};
  const stores=[]; const open=()=>{const s=new ClosureJobStore(jobs,options);stores.push(s);return s;};
  const store=open(), db=new DatabaseSync(services);
  db.exec('pragma foreign_keys=on;'+fs.readFileSync(path.join(__dirname,'../server/schema.sql'),'utf8'));
  db.exec(`create table auth_fixture(owner text primary key);
    create table projects_fixture(owner text,id text,primary key(owner,id));
    create table objects_fixture(owner text,key text primary key,bytes text);
    create table guards_fixture(owner text primary key,private integer,publication integer,drained integer);`);
  for (const [owner,site,n] of [[A,'site-a',1],[B,'site-a-long',3]]) {
    db.prepare('insert into auth_fixture values(?)').run(owner);
    db.prepare('insert into projects_fixture values(?,?)').run(owner,'shared');
    db.prepare('insert into objects_fixture values(?,?,?)').run(owner,owner+'/'+image(n),'private-'+owner);
    db.prepare('insert into sites values(?,?,?,?,?)').run(site,site+'.example.test',owner,'v1',1);
    db.prepare('insert into published_versions values(?,?,?)').run(site,'v1',1);
    db.prepare('insert into version_retirements values(?,?,?)').run(site,'old',0);
    for (const v of ['v1','old','unfinished']) db.prepare('insert into site_files values(?,?,?,?,?)').run('sites/'+site+'/v/'+v+'/index.html',Buffer.from(owner),owner.length,'fixture','text/html');
    db.prepare('insert into subscriptions values(?,?,?,?,?,?,?,?)').run('sub-'+site,owner,'cus-'+site,'canceled',1,0,0,1);
    db.prepare('insert into checkout_links values(?,?)').run('sub-'+site,owner);
  }
  db.prepare('insert into objects_fixture values(?,?,?)').run(A,A+'/'+image(2),'private-A-two');
  db.prepare('insert into billing_events values(?,?,?,?,?)').run('evt-global','fixture',1,'accepted','2026-10-06');
  db.prepare('insert into site_files values(?,?,?,?,?)').run('sites/unknown-owner/v/pending/file.txt',Buffer.from('untouched'),9,'fixture','text/plain');
  const hooks={}; const calls=[];
  const adapter={mode:'local-rehearsal',
    async preflight(c) {
      const owner=c.ownerId, guards=db.prepare('select * from guards_fixture where owner=?').get(owner);
      const subset=(values,allowed)=>values.every(v=>allowed.includes(v));
      const ownsSites=c.scope.siteIds.every(id=>{const r=db.prepare('select owner_id from sites where id=?').get(id);return !r || r.owner_id===owner;});
      return {...binding(c),
        scopeMatches:ownsSites && subset(db.prepare('select id from projects_fixture where owner=?').all(owner).map(r=>r.id),c.scope.projectIds)
          && subset(db.prepare('select key from objects_fixture where owner=?').all(owner).map(r=>r.key),c.scope.storageObjects)
          && subset(db.prepare('select id from sites where owner_id=?').all(owner).map(r=>r.id),c.scope.siteIds),
        billingSettled:!db.prepare("select 1 from subscriptions where user_id=? and status not in ('canceled','incomplete_expired')").get(owner),
        privateWritesBlocked:guards?.private===1,publicationWritesBlocked:guards?.publication===1,inFlightDrained:guards?.drained===1};
    }
  };
  for (const phase of ['freeze','publication','storage','projects','auth','verify']) adapter[phase]=async c=>{
    c.assertLease(); calls.push({phase,key:c.idempotencyKey,fence:c.fence});
    if (hooks.before) await hooks.before(c);
    c.assertLease();
    if (phase==='freeze') db.prepare('insert or ignore into guards_fixture values(?,1,1,1)').run(c.ownerId);
    if (phase==='publication') for (const id of c.scope.siteIds) {
      const row=db.prepare('select owner_id from sites where id=?').get(id);
      assert.ok(!row || row.owner_id===c.ownerId);
      const prefix='sites/'+id+'/';
      db.exec('begin');
      try {
        db.prepare('delete from site_files where substr(key,1,?)=?').run(prefix.length,prefix);
        db.prepare('delete from published_versions where site_id=?').run(id);
        db.prepare('delete from version_retirements where site_id=?').run(id);
        db.prepare('delete from sites where id=? and owner_id=?').run(id,c.ownerId);
        db.exec('commit');
      } catch(e) {db.exec('rollback');throw e;}
    }
    if (phase==='storage') for (const key of c.scope.storageObjects) {
      c.assertLease(); db.prepare('delete from objects_fixture where owner=? and key=?').run(c.ownerId,key);
      if (hooks.object) await hooks.object(c,key);
    }
    if (phase==='projects') for (const id of c.scope.projectIds) db.prepare('delete from projects_fixture where owner=? and id=?').run(c.ownerId,id);
    if (phase==='auth') {
      assert.equal(db.prepare('select count(*) n from objects_fixture where owner=?').get(c.ownerId).n,0);
      assert.equal(db.prepare('select count(*) n from projects_fixture where owner=?').get(c.ownerId).n,0);
      db.prepare('delete from auth_fixture where owner=?').run(c.ownerId);
    }
    let verified=true;
    if (phase==='verify') {
      verified=['auth_fixture','projects_fixture','objects_fixture'].every(table=>db.prepare('select count(*) n from '+table+' where owner=?').get(c.ownerId).n===0)
        && !db.prepare('select 1 from sites where owner_id=?').get(c.ownerId)
        && c.scope.siteIds.every(id=>!db.prepare('select 1 from site_files where substr(key,1,?)=?').get(('sites/'+id+'/').length,'sites/'+id+'/'));
    }
    if (hooks.after) await hooks.after(c);
    return {...binding(c),verified};
  };
  const protectedSnapshot=()=>JSON.stringify({
    auth:db.prepare('select * from auth_fixture where owner=?').all(B), projects:db.prepare('select * from projects_fixture where owner=?').all(B),
    images:db.prepare('select * from objects_fixture where owner=?').all(B), sites:db.prepare('select * from sites where owner_id=?').all(B),
    versions:db.prepare("select * from published_versions where site_id='site-a-long'").all(),retirements:db.prepare("select * from version_retirements where site_id='site-a-long'").all(),
    files:db.prepare("select * from site_files where substr(key,1,13)<>'sites/site-a/' order by key").all(),
    subscriptions:db.prepare('select * from subscriptions order by id').all(), links:db.prepare('select * from checkout_links order by subscription_id').all(),events:db.prepare('select * from billing_events').all()
  });
  const job=store.create({ownerId:A,scope,reviewed:true});
  t.after(()=>{for(const s of stores)try{s.close();}catch{}db.close();fs.rmSync(dir,{recursive:true,force:true});});
  return {store,open,db,job,adapter,hooks,calls,protectedSnapshot,jobs,dir,tick:(ms=11)=>now+=ms};
}
async function reach(f,phase,store=f.store) {
  while(store.read(f.job.id).phase!==phase) assert.equal((await runNext(store,f.job.id,f.adapter)).result,'ADVANCED');
}

test('Durable job survives partial image deletion and reopen; Auth remains until images are gone',async t=>{
  const f=fixture(t), before=f.protectedSnapshot();
  await reach(f,'storage'); let fail=true;
  f.hooks.object=()=>{if(fail){fail=false;throw Error('PRIVATE_PROVIDER_SECRET');}};
  const failed=await runNext(f.store,f.job.id,f.adapter);
  assert.equal(failed.job.status,'retry'); assert.equal(failed.job.phase,'storage');
  assert.equal(f.db.prepare('select count(*) n from objects_fixture where owner=?').get(A).n,1);
  assert.ok(f.db.prepare('select 1 from auth_fixture where owner=?').get(A));
  assert.equal(f.protectedSnapshot(),before);
  f.store.close();
  const probe=spawnSync(process.execPath,['-e',`const {ClosureJobStore}=require(${JSON.stringify(path.resolve(__dirname,'../tools/account-closure-jobs.cjs'))});const s=new ClosureJobStore(process.argv[1],{mode:'local-rehearsal'});process.stdout.write(s.read(process.argv[2]).phase);s.close();`,f.jobs,f.job.id],{encoding:'utf8'});
  assert.equal(probe.status,0,probe.stderr); assert.equal(probe.stdout,'storage','checkpoint survives a separate process');
  const resumed=f.open();f.tick();await reach(f,'complete',resumed);
  assert.equal(f.protectedSnapshot(),before);
  assert.equal(f.db.prepare('select count(*) n from auth_fixture where owner=?').get(A).n,0);
  assert.ok(f.db.prepare('select 1 from guards_fixture where owner=?').get(A),'persistent guard outlives Auth');
  assert.equal((await runNext(resumed,f.job.id,f.adapter)).result,'NOT_CLAIMED');
  const storage=f.calls.filter(c=>c.phase==='storage');assert.equal(storage.length,2);assert.equal(storage[0].key,storage[1].key);
  assert.ok(!JSON.stringify(resumed.events(f.job.id)).includes('PRIVATE_PROVIDER_SECRET'));
  assert.ok(!fs.readFileSync(f.jobs).includes(Buffer.from('PRIVATE_PROVIDER_SECRET')));
});

test('Crash after side effect but before checkpoint safely repeats the same phase',async t=>{
  const f=fixture(t);await reach(f,'storage');
  const claim=f.store.claim(f.job.id);
  const c={...claim,idempotencyKey:'crash-fixture',assertLease:()=>f.store.assertLease(claim)};
  await f.adapter.storage(c); // Process vanishes now: no advance and no failure record.
  assert.equal(f.store.read(f.job.id).phase,'storage');
  f.store.close();const resumed=f.open();f.tick(101);
  assert.equal((await runNext(resumed,f.job.id,f.adapter)).result,'ADVANCED');
  await reach(f,'complete',resumed);
});

test('Two connections cannot claim together; expired worker cannot write or checkpoint after takeover',async t=>{
  const f=fixture(t), second=f.open();
  const first=f.store.claim(f.job.id);assert.equal(second.claim(f.job.id),null);
  f.tick(101);const next=second.claim(f.job.id);assert.ok(next.fence>first.fence);
  for(const method of ['advance','renew','assertLease'])assert.throws(()=>f.store[method](first),/STALE_CLAIM/);
  assert.throws(()=>f.store.fail(first,'STEP_FAILED'),/STALE_CLAIM/);
  await assert.rejects(f.adapter.freeze({...first,assertLease:()=>f.store.assertLease(first)}),/STALE_CLAIM/);
  assert.equal(f.db.prepare('select count(*) n from guards_fixture').get().n,0);
  f.tick(50);second.renew(next);f.tick(60);assert.equal(f.store.claim(f.job.id),null);
});

test('Delayed running adapter loses its lease without accepting a stale result',async t=>{
  const f=fixture(t), second=f.open();let release,entered;
  const wait=new Promise(resolve=>{release=resolve;});const started=new Promise(resolve=>{entered=resolve;});
  f.hooks.before=async()=>{entered();await wait;};
  const pending=runNext(f.store,f.job.id,f.adapter);await started;
  f.tick(101);const takeover=second.claim(f.job.id);release();
  assert.equal((await pending).result,'STALE_CLAIM');
  assert.equal(second.read(f.job.id).fence,takeover.fence);
  assert.equal(f.db.prepare('select count(*) n from guards_fixture').get().n,0);
});

test('Active or unknown billing blocks before freeze and is checked again before every phase',async t=>{
  const f=fixture(t);
  for(const status of ['active','unknown']){
    f.db.prepare('update subscriptions set status=? where user_id=?').run(status,A);
    const result=await runNext(f.store,f.job.id,f.adapter);assert.equal(result.result,'GUARD_REQUIRED');assert.equal(result.job.status,'blocked');
    assert.equal(f.calls.length,0);f.store.resume(f.job.id,result.job.fence);
  }
  f.db.prepare("update subscriptions set status='canceled' where user_id=?").run(A);
  await reach(f,'storage');f.db.prepare("update subscriptions set status='active' where user_id=?").run(A);
  assert.equal((await runNext(f.store,f.job.id,f.adapter)).result,'GUARD_REQUIRED');
  assert.equal(f.db.prepare('select count(*) n from objects_fixture where owner=?').get(A).n,2);
});

test('Missing cross-service guard, changed ownership and new unapproved objects stop deletion',async t=>{
  for(const kind of ['guard','owner','extra']) await t.test(kind,async sub=>{
    const f=fixture(sub);await reach(f,'publication');
    if(kind==='guard')f.db.prepare('update guards_fixture set drained=0 where owner=?').run(A);
    if(kind==='owner')f.db.prepare("update sites set owner_id=null where id='site-a'").run();
    if(kind==='extra')f.db.prepare('insert into objects_fixture values(?,?,?)').run(A,A+'/'+image(9),'new');
    const result=await runNext(f.store,f.job.id,f.adapter);
    assert.equal(result.result,kind==='guard'?'GUARD_REQUIRED':'SCOPE_CHANGED');assert.equal(result.job.status,'blocked');
    assert.ok(f.db.prepare("select 1 from sites where id='site-a'").get());
    assert.ok(f.db.prepare('select 1 from auth_fixture where owner=?').get(A));
  });
});

test('Retry backoff, maximum attempts and explicit stale-review protection are durable',async t=>{
  const f=fixture(t);f.hooks.before=()=>{throw Error('secret-token-do-not-record');};
  for(let i=1;i<=3;i++){
    const r=await runNext(f.store,f.job.id,f.adapter);assert.equal(r.job.attempts,i);assert.equal(r.result,'STEP_FAILED');
    assert.equal(r.job.status,i===3?'blocked':'retry');assert.equal((await runNext(f.store,f.job.id,f.adapter)).result,'NOT_CLAIMED');
    f.tick(100);
  }
  const reopened=f.open(), job=reopened.read(f.job.id);assert.equal(job.status,'blocked');
  assert.throws(()=>reopened.resume(job.id,job.fence-1),/REVIEW_STATE_CHANGED/);
  reopened.resume(job.id,job.fence);f.hooks.before=null;await reach(f,'complete',reopened);
  assert.ok(!JSON.stringify(reopened.events(job.id)).includes('secret-token'));
});

test('Bad adapter receipts and guard loss after an operation cannot advance a checkpoint',async t=>{
  const f=fixture(t);const original=f.adapter.freeze;
  f.adapter.freeze=async c=>({...await original(c),ownerId:B});
  const result=await runNext(f.store,f.job.id,f.adapter);assert.equal(result.result,'UNVERIFIED_RESULT');assert.equal(result.job.phase,'freeze');
  f.tick();f.adapter.freeze=original;
  f.hooks.after=()=>f.db.prepare('update guards_fixture set publication=0 where owner=?').run(A);
  assert.equal((await runNext(f.store,f.job.id,f.adapter)).result,'GUARD_REQUIRED');
  assert.equal(f.store.read(f.job.id).phase,'freeze');
});

test('Final verification failure never reports completion',async t=>{
  const f=fixture(t);await reach(f,'verify');
  f.adapter.verify=async c=>({...binding(c),verified:false});
  const r=await runNext(f.store,f.job.id,f.adapter);assert.equal(r.result,'UNVERIFIED_RESULT');assert.equal(r.job.phase,'verify');assert.equal(r.job.status,'retry');
});

test('Every phase tolerates a lost acknowledgement after its side effect',async t=>{
  for(const phase of ['freeze','publication','storage','projects','auth','verify']) await t.test(phase,async sub=>{
    const f=fixture(sub), before=f.protectedSnapshot();await reach(f,phase);
    let once=true;f.hooks.after=c=>{if(c.phase===phase&&once){once=false;throw Error('ACK_LOST');}};
    const failed=await runNext(f.store,f.job.id,f.adapter);
    assert.equal(failed.job.phase,phase);assert.equal(failed.job.status,'retry');
    f.store.close();const resumed=f.open();f.tick();await reach(f,'complete',resumed);
    const calls=f.calls.filter(c=>c.phase===phase);assert.equal(calls.length,2);assert.equal(calls[0].key,calls[1].key);
    assert.equal(f.protectedSnapshot(),before);
    assert.equal(resumed.events(f.job.id).filter(e=>e.kind==='verified').length,6);
  });
});

test('Reviewed exact scope is immutable, owner-bound and required before any job exists',async t=>{
  const f=fixture(t);
  assert.equal(f.store.create({ownerId:A,scope,reviewed:true}).id,f.job.id);
  assert.throws(()=>f.store.create({ownerId:A,scope:{...scope,siteIds:[]},reviewed:true}),/SCOPE_CONFLICT/);
  assert.throws(()=>f.store.create({ownerId:B,scope,reviewed:false}),/SCOPE_REVIEW_REQUIRED/);
  for(const invalid of [{...scope,storageObjects:[B+'/'+image(1)]},{...scope,siteIds:['site-a/%']},{...scope,projectIds:['shared','shared']},{...scope,extra:true}])assert.throws(()=>f.store.create({ownerId:A,scope:invalid,reviewed:true}),/INVALID_SCOPE/);
  assert.throws(()=>new ClosureJobStore(path.join(f.dir,'not-created.sqlite'),{mode:'live'}),/LOCAL_MODE_REQUIRED/);
  assert.equal(fs.existsSync(path.join(f.dir,'not-created.sqlite')),false);
  await assert.rejects(runNext(f.store,f.job.id,{...f.adapter,mode:'live'}),/LOCAL_ADAPTER_REQUIRED/);
  assert.equal(f.store.read(f.job.id).fence,0);
  f.store.db.prepare('update closure_jobs_v1 set scope=? where id=?').run('{}',f.job.id);
  assert.throws(()=>f.store.claim(f.job.id),/SCOPE_CORRUPT/);
});
