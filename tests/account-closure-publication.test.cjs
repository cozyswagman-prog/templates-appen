const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {createPublicationClosure}=require('../server/account-closure-publication.mjs');
const {d1Bucket,d1Sites}=require('../server/d1-publication-stores.mjs');
const {createPublisher}=require('../server/publisher.mjs');
const {handlePublishRequest}=require('../server/publish-api.mjs');
const {createBilling,memoryBillingStore,stripeSignature}=require('../server/billing.mjs');
const {ClosureJobStore,runNext,binding}=require('../tools/account-closure-jobs.cjs');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const context=()=>({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',ownerId:A,scopeHash:'a'.repeat(64),fence:1,scope:{siteIds:['site-a']}});
const project={name:'Synthetic',templateId:'cafe',values:{}};
// Executes the actual prepared SQL and batch as a local SQLite transaction.
function d1(sqlite){return {
  prepare(sql){let params=[];const execute=()=>{
    const s=sqlite.prepare(sql);
    if(/^\s*select/i.test(sql))return {results:s.all(...params),meta:{changes:0}};
    return {results:[],meta:{changes:Number(s.run(...params).changes)}};
  };const q={bind:(...p)=>{params=p;return q;},first:async()=>sqlite.prepare(sql).get(...params)||null,
    all:async()=>({results:sqlite.prepare(sql).all(...params)}),run:async()=>execute(),execute};return q;},
  async batch(statements){sqlite.exec('begin immediate');try{const result=statements.map(s=>s.execute());sqlite.exec('commit');return result;}catch(e){sqlite.exec('rollback');throw e;}}
};}
async function fixture(t,{schema=true}={}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'templates-publication-closure-'));
  const sql=new DatabaseSync(path.join(dir,'d1.sqlite'));sql.exec('pragma foreign_keys=on;'+fs.readFileSync(path.join(__dirname,'../server/schema.sql'),'utf8'));
  if(schema)sql.exec(fs.readFileSync(path.join(__dirname,'../server/proposals/account-closure-publication.sql'),'utf8'));
  const db=d1(sql),bucket=d1Bucket(db),sites=d1Sites(db),closure=createPublicationClosure({db,backend:'d1'});
  const protectedStores=closure.protect({sites,bucket});let next=0;
  const render=()=>new Map([['index.html','<html><img src="images/bild-1.png"></html>'],['images/bild-1.png',new Uint8Array([1,2,3])]]);
  const publisher=createPublisher({...protectedStores,render,newId:()=>`00000000-0000-4000-8000-${String(++next).padStart(12,'0')}`});
  await sites.create('site-a','a.example.test',A);await sites.create('site-a-long','b.example.test',B);
  const rawPublisher=createPublisher({sites,bucket,render,newId:()=>`00000000-0000-4000-9000-${String(++next).padStart(12,'0')}`});
  const first=await rawPublisher.publish('site-a',project);await rawPublisher.publish('site-a-long',project);
  sql.prepare('insert into site_files values(?,?,?,?,?)').run('sites/unknown-owner/v/pending/file.txt',Buffer.from('keep'),4,'fixture','text/plain');
  sql.prepare('insert into subscriptions values(?,?,?,?,?,?,?,?)').run('sub-a',A,'cus-a','canceled',1,0,0,1);
  sql.prepare('insert into checkout_links values(?,?)').run('sub-a',A);
  sql.prepare('insert into billing_events values(?,?,?,?,?)').run('evt-global','fixture',1,'kept','2026-10-06');
  const preserved=()=>JSON.stringify({site:sql.prepare('select * from sites where owner_id=?').all(B),
    versions:sql.prepare("select * from published_versions where site_id='site-a-long'").all(),
    files:sql.prepare("select * from site_files where substr(key,1,13)<>'sites/site-a/' order by key").all(),
    subs:sql.prepare('select * from subscriptions').all(),links:sql.prepare('select * from checkout_links').all(),events:sql.prepare('select * from billing_events').all()});
  const counts=()=>JSON.stringify({sites:sql.prepare('select * from sites order by id').all(),files:sql.prepare('select * from site_files order by key').all(),versions:sql.prepare('select * from published_versions order by site_id,version_id').all()});
  t.after(()=>{sql.close();fs.rmSync(dir,{recursive:true,force:true});});
  return {dir,sql,db,bucket,sites,closure,protectedStores,publisher,render,first,preserved,counts};
}

test('D1 closure hides public HTML and pinned assets, and retains guards after exact deletion',async t=>{
  const f=await fixture(t),c=context(),before=f.preserved();
  assert.equal((await f.publisher.serve('a.example.test','/')).status,200);
  assert.equal((await f.closure.freeze(c)).publicationWritesBlocked,true);
  for(const url of ['/','/_v/'+f.first.versionId+'/images/bild-1.png'])assert.equal((await f.publisher.serve('a.example.test',url)).status,404);
  assert.equal((await f.publisher.serve('b.example.test','/')).status,200);
  assert.equal((await f.closure.erase(c)).verified,true);await f.closure.erase(c);
  assert.equal(f.preserved(),before);assert.equal(f.sql.prepare('select count(*) n from publication_closures').get().n,1);
  assert.equal(f.sql.prepare('select count(*) n from closed_publication_sites').get().n,1);
  await assert.rejects(f.sites.create('site-a','reuse.example.test',B),{code:'account-closed'});
  await assert.rejects(f.sites.create('new-site','new.example.test',A),{code:'account-closed'});
  assert.throws(()=>f.sql.exec('delete from publication_closures'),/CLOSURE_PERMANENT/);
  assert.throws(()=>f.sql.exec('delete from closed_publication_sites'),/CLOSURE_PERMANENT/);
});

test('Raw D1 write paths cannot bypass the barrier, including replacement and owner changes',async t=>{
  const f=await fixture(t);await f.closure.freeze(context());
  const key='sites/site-a/v/unfinished/index.html';
  await assert.rejects(f.bucket.put(key,new Uint8Array([7]),{contentType:'text/html',sha256:'test'}),/ACCOUNT_CLOSED/);
  await assert.rejects(f.sites.swap('site-a',1,'00000000-0000-4000-8000-000000000055'),/ACCOUNT_CLOSED/);
  assert.throws(()=>f.sql.prepare('update sites set owner_id=null where id=?').run('site-a'),/ACCOUNT_CLOSED/);
  const existing=f.sql.prepare("select key from site_files where key like 'sites/site-a/%' limit 1").get().key;
  assert.throws(()=>f.sql.prepare('update site_files set bytes=? where key=?').run(Buffer.from('bad'),existing),/ACCOUNT_CLOSED/);
  assert.throws(()=>f.sql.prepare('insert or replace into site_files values(?,?,?,?,?)').run(existing,Buffer.from('bad'),3,'bad','text/html'),/ACCOUNT_CLOSED/);
  assert.throws(()=>f.sql.prepare('insert into published_versions values(?,?,?)').run('site-a','unapproved',99),/ACCOUNT_CLOSED/);
});

test('A publish paused before a file write cannot recreate files after closure and erasure',async t=>{
  const f=await fixture(t);let release,entered;
  const wait=new Promise(r=>release=r),started=new Promise(r=>entered=r);
  const bucket={...f.protectedStores.bucket,put:async(...args)=>{entered();await wait;return f.protectedStores.bucket.put(...args);}};
  const publisher=createPublisher({sites:f.protectedStores.sites,bucket,render:f.render});
  const pending=publisher.publish('site-a',project);await started;
  await f.closure.freeze(context());await f.closure.erase(context());release();
  await assert.rejects(pending,{code:'account-closed'});
  assert.equal(f.sql.prepare("select count(*) n from site_files where substr(key,1,13)='sites/site-a/'").get().n,0);
});

test('Delayed publish and rollback cannot switch the pointer after the database barrier',async t=>{
  for(const action of ['publish','rollback'])await t.test(action,async sub=>{
    const f=await fixture(sub);let release,entered;
    const wait=new Promise(r=>release=r),started=new Promise(r=>entered=r);
    const sites={...f.protectedStores.sites,swap:async(...args)=>{entered();await wait;return f.protectedStores.sites.swap(...args);}};
    const publisher=createPublisher({sites,bucket:f.protectedStores.bucket,render:f.render});
    const pending=action==='publish'?publisher.publish('site-a',project):publisher.rollback('site-a',f.first.versionId);
    await started;await f.closure.freeze(context());release();await assert.rejects(pending,{code:'account-closed'});
    assert.equal((await f.sites.get('site-a')).revision,1);
    await f.closure.erase(context());assert.equal((await f.publisher.serve('a.example.test','/')).status,404);
  });
});

test('Changed site inventory is rejected atomically, and another owner can never be reserved',async t=>{
  const f=await fixture(t),c=context();
  await assert.rejects(f.closure.freeze({...c,scope:{siteIds:[]}}),{code:'closure-conflict'});
  await assert.rejects(f.closure.freeze({...c,scope:{siteIds:['site-a','site-a-long']}}),{code:'closure-conflict'});
  assert.equal(f.sql.prepare('select count(*) n from publication_closures').get().n,0);
  assert.equal(f.sql.prepare('select count(*) n from closed_publication_sites').get().n,0);
  await f.closure.freeze(c);
  for(const changed of [{...c,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'},{...c,scopeHash:'b'.repeat(64)},{...c,scope:{siteIds:['site-a','extra-site']}}])await assert.rejects(f.closure.freeze(changed),{code:'closure-conflict'});
});

test('A newer fence prevents stale deletion even after a successful earlier proof',async t=>{
  const f=await fixture(t),c=context();await f.closure.freeze(c);await f.closure.proof(c);
  const newer={...c,fence:2};await f.closure.freeze(newer);const before=f.counts();
  await assert.rejects(f.closure.erase(c),{code:'closure-conflict'});assert.equal(f.counts(),before);
  await assert.rejects(f.closure.freeze(c),{code:'closure-conflict'});
  assert.equal((await f.closure.erase(newer)).verified,true);
});

test('A failed deletion batch rolls all earlier file deletions back before retry',async t=>{
  const f=await fixture(t),c=context();await f.closure.freeze(c);const before=f.counts();
  f.sql.exec("create trigger simulated_failure before delete on published_versions begin select raise(abort,'SIMULATED_FAILURE'); end;");
  await assert.rejects(f.closure.erase(c),/SIMULATED_FAILURE/);assert.equal(f.counts(),before);
  f.sql.exec('drop trigger simulated_failure');assert.equal((await f.closure.erase(c)).verified,true);
});

test('Missing schema and R2 configuration fail closed; ordinary stores stay usable without opt-in',async t=>{
  const f=await fixture(t,{schema:false});
  assert.ok(await f.sites.get('site-a'));
  await assert.rejects(f.closure.assertOpen(A));await assert.rejects(f.publisher.serve('a.example.test','/'));
  assert.throws(()=>createPublicationClosure({db:f.db,backend:'r2'}),{code:'closure-config'});
});

test('Closed account cannot create, publish or start checkout; portal and signed billing facts remain available',async t=>{
  const f=await fixture(t);await f.closure.freeze(context());
  let checkoutCalls=0,loadCalls=0,portalCalls=0;
  const env={APP_ORIGIN:'https://app.example.test',REQUIRE_PLAN:'1',STRIPE_WEBHOOK_SECRET:'whsec_SYNTHETIC_ONLY'};
  const store=memoryBillingStore(),billing=createBilling({store,productId:'prod_templates'});
  const deps={env,...f.protectedStores,closures:f.closure,publisher:f.publisher,billing,
    source:{getUser:async()=>({id:A}),loadProject:async()=>{loadCalls++;return {project};}},
    checkout:async()=>{checkoutCalls++;return 'https://checkout.stripe.com/fixture';},portal:async()=>{portalCalls++;return 'https://billing.stripe.com/fixture';}};
  const req=(url,method='POST',body={})=>new Request('https://api.example.test'+url,{method,headers:{Origin:env.APP_ORIGIN,Authorization:'Bearer SYNTHETIC'},...(method==='GET'?{}:{body:JSON.stringify(body)})});
  for(const [url,method] of [['/api/sites','GET'],['/api/sites','POST'],['/api/publish','POST'],['/api/billing/checkout','POST']]){
    const r=await handlePublishRequest(req(url,method),deps);assert.equal(r.status,423);assert.equal((await r.json()).code,'account-closed');
  }
  const event={id:'evt_late',object:'event',type:'customer.subscription.created',created:Math.floor(Date.now()/1000),data:{object:{id:'sub_late',object:'subscription',status:'active',customer:'cus_fixture',metadata:{user_id:A},items:{data:[{price:{product:'prod_templates'},current_period_end:2000000000}]}}}};
  const raw=JSON.stringify(event),stamp=String(Math.floor(Date.now()/1000));
  const signature=await stripeSignature(env.STRIPE_WEBHOOK_SECRET,stamp,raw);
  const r=await handlePublishRequest(new Request('https://api.example.test/api/stripe/webhook',{method:'POST',headers:{'Stripe-Signature':`t=${stamp},v1=${signature}`},body:raw}),deps);
  assert.equal(r.status,200);assert.equal((await billing.plan(A)).active,true);
  assert.equal((await handlePublishRequest(req('/api/publish'),deps)).status,423,'billing events cannot reopen publication');
  assert.equal((await handlePublishRequest(req('/api/billing/portal'),deps)).status,200);
  assert.deepEqual([checkoutCalls,loadCalls,portalCalls],[0,0,1]);
});

test('Durable coordinator uses the actual publication adapter across phase fencing and retries',async t=>{
  const f=await fixture(t),before=f.preserved();const store=new ClosureJobStore(path.join(f.dir,'jobs.sqlite'),{mode:'local-rehearsal'});
  try {
  const job=store.create({ownerId:A,scope:{siteIds:['site-a'],projectIds:[],storageObjects:[]},reviewed:true});let frozen=false;
  const adapter={mode:'local-rehearsal',
    preflight:async c=>{if(frozen)await f.closure.freeze(c);return {...binding(c),scopeMatches:true,billingSettled:true,privateWritesBlocked:frozen,publicationWritesBlocked:frozen,inFlightDrained:frozen};},
    freeze:async c=>{await f.closure.freeze(c);frozen=true;return {...binding(c),verified:true};},
    publication:c=>f.closure.erase(c),
    storage:async c=>({...binding(c),verified:true}),projects:async c=>({...binding(c),verified:true}),auth:async c=>({...binding(c),verified:true}),
    verify:async c=>f.closure.erase(c)};
  while(store.read(job.id).status!=='complete')assert.equal((await runNext(store,job.id,adapter)).result,'ADVANCED');
  assert.equal(f.preserved(),before);assert.equal(f.sql.prepare('select fence from publication_closures').get().fence,6);
  } finally {store.close();}
});
