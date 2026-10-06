// Actual Supabase JS client, locally intercepted HTTP, actual SQL in PGlite.
// The fake Storage/Auth services alone delete their fixture bytes/rows.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const {createClient}=require('@supabase/supabase-js');
const {createSupabaseClosure}=require('../tools/account-closure-supabase.cjs');
const {ClosureJobStore,normalizeScope,binding,runNext}=require('../tools/account-closure-jobs.cjs');
const {DatabaseSync}=require('node:sqlite');
const {createPublicationClosure}=require('../server/account-closure-publication.mjs');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const JOB='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const key=(n,ext='png')=>n.toString(16).padStart(64,'0')+'.'+ext;
async function fixture(t){
  const pg=new PGlite(),bytes=new Map(),calls=[],hooks={};
  t.after(()=>pg.close());
  await pg.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
    create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated;
    create schema storage;grant usage on schema storage to anon,authenticated,service_role;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(bucket_id text references storage.buckets(id),name text,primary key(bucket_id,name));
    alter table storage.objects enable row level security;
    grant select,insert,update,delete on storage.objects to anon,authenticated;
    insert into auth.users values('${A}'),('${B}');`);
  const migrations=path.join(__dirname,'../supabase/migrations');
  for(const f of fs.readdirSync(migrations).sort())await pg.exec(fs.readFileSync(path.join(migrations,f),'utf8'));
  for(const f of ['account-closure.sql','account-closure-execution.sql'])await pg.exec(fs.readFileSync(path.join(__dirname,'../supabase/proposals',f),'utf8'));
  const as=async(role,id,sql,args=[])=>{
    await pg.exec('set role '+role);await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
    try{return (await pg.query(sql,args)).rows;}finally{await pg.exec('reset role');}
  };
  const reserve=async(owner,n,upload=true,ext='png')=>{
    const name=(await as('authenticated',owner,'select public.reserve_project_image($1,$2) r',[key(n,ext),owner]))[0].r.name;
    if(upload){await as('authenticated',owner,'insert into storage.objects values($1,$2)',['project-images',owner+'/'+name]);bytes.set(owner+'/'+name,Buffer.from('fixture-'+n));}
    return name;
  };
  for(const [owner,n] of [[A,1],[B,2]]){
    const name=await reserve(owner,n,true,owner===A?'gif':'png');
    await as('authenticated',owner,'select * from public.save_project($1,$2,0,$3)',['shared',{name:'Synthetic',templateId:'cafe',values:{'index.html':{2:'templates-image:v1:'+name}}},owner]);
  }
  await reserve(A,3);await reserve(A,4,false);
  const scope=normalizeScope(A,{projectIds:['shared'],siteIds:[],storageObjects:(await pg.query('select name from public.project_images where owner_id=$1',[A])).rows.map(r=>A+'/'+r.name)});
  const hash=createHash('sha256').update(JSON.stringify(scope)).digest('hex');
  let lease=true;
  const context=(phase='freeze',fence=1)=>({id:JOB,ownerId:A,scopeHash:hash,scope,phase,fence,assertLease:()=>{if(!lease)throw Object.assign(Error('STALE_CLAIM'),{closureCode:'STALE_CLAIM'});}});
  const rpcArgs=['p_owner','p_job','p_hash','p_fence'];
  const execute=async(name,p,role='service_role')=>{
    const keys=name==='claim_closure_execution'?[...rpcArgs,'p_projects','p_objects']:rpcArgs;
    assert.ok(['claim_closure_execution','closure_execution_state','erase_closed_projects'].includes(name));
    const values=keys.map(k=>['p_projects','p_objects'].includes(k)?JSON.stringify(p[k]):p[k]);
    return (await as(role,null,`select public.${name}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) r`,values))[0].r;
  };
  const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
  const fetch=async(input,init)=>{
    const req=new Request(input,init),url=new URL(req.url);assert.equal(url.origin,'https://closure.test','no real service may be contacted');
    const body=await req.json();calls.push({method:req.method,path:url.pathname});
    if(url.pathname.startsWith('/rest/v1/rpc/')){
      try{let value=await execute(url.pathname.split('/').pop(),body);if(hooks.receipt)value=hooks.receipt(value);return reply(value);}
      catch(e){return reply({code:e.code||'TEST_ERROR',message:'MASKED_PROVIDER_DETAIL'},400);}
    }
    if(url.pathname==='/storage/v1/object/project-images'&&req.method==='DELETE'){
      assert.ok(Array.isArray(body.prefixes));if(hooks.beforeStorage)await hooks.beforeStorage(body.prefixes);
      for(const name of body.prefixes){
        if(hooks.storageMode!=='noDelete'){bytes.delete(name);await pg.query('delete from storage.objects where bucket_id=$1 and name=$2',['project-images',name]);}
        if(hooks.storageMode==='partialFail'){hooks.storageMode=null;return reply({statusCode:'500',error:'Failure',message:'PRIVATE_PROVIDER_SECRET'},500);}
      }
      return reply(body.prefixes.map(name=>({name})));
    }
    if(url.pathname==='/auth/v1/admin/users/'+A&&req.method==='DELETE'){
      assert.equal(body.should_soft_delete,false);
      if(hooks.authMode==='error')return reply({code:'unexpected_failure',msg:'PRIVATE_PROVIDER_SECRET'},500);
      assert.equal([...bytes.keys()].filter(n=>n.startsWith(A+'/')).length,0);
      if(hooks.authMode!=='noDelete')await pg.query('delete from auth.users where id=$1',[A]);
      if(hooks.authMode==='lostAck'){hooks.authMode=null;throw Error('PRIVATE_PROVIDER_SECRET');}
      return reply({id:A,aud:'authenticated',created_at:'2026-10-06T00:00:00Z'});
    }
    throw Error('Unexpected local SDK route');
  };
  const client=createClient('https://closure.test','sb_secret_SYNTHETIC_ONLY',{global:{fetch},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const adapter=createSupabaseClosure({client,mode:'local-rehearsal',batchSize:1});
  const preserved=async()=>JSON.stringify({auth:(await pg.query('select * from auth.users where id=$1',[B])).rows,
    projects:(await pg.query('select * from public.projects where owner_id=$1',[B])).rows,
    images:(await pg.query('select * from public.project_images where owner_id=$1',[B])).rows,
    refs:(await pg.query('select * from public.project_image_refs where owner_id=$1',[B])).rows,
    objects:(await pg.query('select * from storage.objects where left(name,37)=$1',[B+'/'])).rows,
    bytes:[...bytes].filter(([k])=>k.startsWith(B+'/'))});
  return {pg,bytes,calls,hooks,as,reserve,context,execute,adapter,client,preserved,loseLease:()=>lease=false};
}
const rpcParams=c=>({p_owner:c.ownerId,p_job:c.id,p_hash:c.scopeHash,p_fence:c.fence,p_projects:c.scope.projectIds,p_objects:c.scope.storageObjects});

test('Supabase SDK closure flow: batches, verification, stale sessions and retained marker',async t=>{
  const f=await fixture(t),before=await f.preserved();
  await f.adapter.freeze(f.context());
  assert.deepEqual(await f.as('authenticated',A,'select * from public.projects'),[]);
  await assert.rejects(f.reserve(A,8),{code:'PT423'});
  await assert.rejects(f.adapter.auth(f.context('auth')),/GUARD_REQUIRED/);
  await assert.rejects(f.adapter.projects(f.context('projects')),/GUARD_REQUIRED/);
  await f.adapter.storage(f.context('storage'));await f.adapter.projects(f.context('projects'));await f.adapter.auth(f.context('auth'));
  assert.equal((await f.adapter.verify(f.context('verify'))).verified,true);
  await f.adapter.auth(f.context('auth'));
  assert.equal(f.calls.filter(r=>r.path.startsWith('/auth/')).length,1,'already missing Auth is idempotent');
  assert.equal(f.calls.filter(r=>r.path.startsWith('/storage/')).length,2,'bounded Storage API batches');
  assert.equal((await f.pg.query('select count(*) n from public.account_closures where owner_id=$1',[A])).rows[0].n,1);
  assert.equal((await f.pg.query('select count(*) n from public.account_closure_execution where owner_id=$1',[A])).rows[0].n,1);
  assert.equal(await f.preserved(),before);
});

test('Partial Storage failure retains Auth and project data; retry finishes only the remaining bytes',async t=>{
  const f=await fixture(t),before=await f.preserved();await f.adapter.freeze(f.context());f.hooks.storageMode='partialFail';
  await assert.rejects(f.adapter.storage(f.context('storage')),e=>e.message==='STEP_FAILED'&&!e.message.includes('SECRET'));
  const s=await f.adapter.state(f.context());assert.equal(s.counts.objects,1);assert.equal(s.counts.projects,1);assert.equal(s.authPresent,true);
  await f.adapter.storage(f.context('storage'));await f.adapter.projects(f.context('projects'));await f.adapter.auth(f.context('auth'));
  assert.equal(await f.preserved(),before);
});

test('False Storage success and false Auth success do not advance verification',async t=>{
  const f=await fixture(t);await f.adapter.freeze(f.context());f.hooks.storageMode='noDelete';
  await assert.rejects(f.adapter.storage(f.context('storage')),/UNVERIFIED_RESULT/);
  f.hooks.storageMode=null;await f.adapter.storage(f.context('storage'));await f.adapter.projects(f.context('projects'));
  f.hooks.authMode='noDelete';await assert.rejects(f.adapter.auth(f.context('auth')),/UNVERIFIED_RESULT/);
  assert.equal((await f.adapter.state(f.context())).authPresent,true);
});

test('Lost Auth acknowledgement is safe to retry; raw service errors are masked',async t=>{
  const f=await fixture(t);await f.adapter.freeze(f.context());await f.adapter.storage(f.context('storage'));await f.adapter.projects(f.context('projects'));
  f.hooks.authMode='error';await assert.rejects(f.adapter.auth(f.context('auth')),e=>e.message==='STEP_FAILED');
  f.hooks.authMode='lostAck';await assert.rejects(f.adapter.auth(f.context('auth')),e=>e.message==='STEP_FAILED');
  const calls=f.calls.length;await f.adapter.auth(f.context('auth'));
  assert.ok(f.calls.slice(calls).every(c=>!c.path.startsWith('/auth/')));
  assert.equal((await f.adapter.verify(f.context('verify'))).verified,true);
});

test('Scope mismatch rolls back both job and private marker atomically',async t=>{
  const f=await fixture(t),p=rpcParams(f.context());
  await assert.rejects(f.execute('claim_closure_execution',{...p,p_projects:[]}),{code:'PT422'});
  await assert.rejects(f.execute('claim_closure_execution',{...p,p_objects:[]}),{code:'PT422'});
  assert.equal((await f.pg.query('select count(*) n from public.account_closures')).rows[0].n,0);
  assert.equal((await f.pg.query('select count(*) n from public.account_closure_execution')).rows[0].n,0);
  assert.equal((await f.as('authenticated',A,'select * from public.projects')).length,1);
});

test('Only service RPCs can bind or erase; customers cannot read or mutate jobs',async t=>{
  const f=await fixture(t),p=rpcParams(f.context());
  for(const role of ['anon','authenticated']){
    await assert.rejects(f.execute('claim_closure_execution',p,role),{code:'42501'});
    for(const name of ['closure_execution_state','erase_closed_projects'])await assert.rejects(f.execute(name,p,role),{code:'42501'});
    await assert.rejects(f.as(role,A,'select * from public.account_closure_execution'),{code:'42501'});
  }
  await f.adapter.freeze(f.context());
  for(const query of ['delete from public.account_closure_execution','update public.account_closure_execution set fence=999'])await assert.rejects(f.as('service_role',null,query),{code:'42501'});
});

test('Stale SQL fence and expired local lease prevent all destructive API calls',async t=>{
  const f=await fixture(t);await f.adapter.freeze(f.context());await f.adapter.freeze(f.context('freeze',2));
  for(const phase of ['storage','projects','auth'])await assert.rejects(f.adapter[phase](f.context(phase)),/STALE_CLAIM/);
  await assert.rejects(f.execute('erase_closed_projects',rpcParams(f.context())),{code:'PT409'});
  assert.ok(f.calls.every(c=>!c.path.startsWith('/storage/')&&!c.path.startsWith('/auth/')));
  f.loseLease();const count=f.calls.length;await assert.rejects(f.adapter.storage(f.context('storage',2)),/STALE_CLAIM/);assert.equal(f.calls.length,count);
});

test('An in-flight Storage response after lease expiry cannot advance to Auth deletion',async t=>{
  const f=await fixture(t);await f.adapter.freeze(f.context());
  f.hooks.beforeStorage=()=>f.loseLease();
  await assert.rejects(f.adapter.storage(f.context('storage')),/STALE_CLAIM/);
  assert.equal([...f.bytes.keys()].filter(k=>k.startsWith(A+'/')).length,1,'already dispatched removal may finish');
  assert.equal(f.calls.filter(c=>c.path.startsWith('/auth/')).length,0);
  assert.equal((await f.pg.query('select count(*) n from auth.users where id=$1',[A])).rows[0].n,1);
});

test('Changed job binding or wrong receipt cannot widen erasure',async t=>{
  const f=await fixture(t);await f.adapter.freeze(f.context());const p=rpcParams(f.context());
  await assert.rejects(f.execute('claim_closure_execution',{...p,p_job:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}),{code:'PT409'});
  await assert.rejects(f.execute('claim_closure_execution',{...p,p_hash:'b'.repeat(64)}),{code:'PT409'});
  f.hooks.receipt=data=>({...data,ownerId:B});await assert.rejects(f.adapter.storage(f.context('storage')),/UNVERIFIED_RESULT/);
  f.hooks.receipt=null;
  assert.ok(f.calls.every(c=>!c.path.startsWith('/storage/')));
});

test('GIF and versioned image names match SQL rules; malformed paths, duplicates and foreign owners fail',async t=>{
  const f=await fixture(t),p=rpcParams(f.context());
  assert.ok(p.p_objects.some(v=>v.endsWith('.gif')));
  for(const objects of [[B+'/'+key(9)],[A+'/'+key(9).replace('.png','.jpg')],[...p.p_objects,p.p_objects[0]],[A+'/'+key(9).replace('.png','-bad.png')]]){
    await assert.rejects(f.execute('claim_closure_execution',{...p,p_objects:objects}),{code:'22023'});
    assert.throws(()=>normalizeScope(A,{...f.context().scope,storageObjects:objects}),/INVALID_SCOPE/);
  }
  await f.reserve(A,9);
  await assert.rejects(f.adapter.freeze(f.context()),/SCOPE_CHANGED/);
  assert.throws(()=>createSupabaseClosure({client:f.client,mode:'live'}),/LOCAL_ADAPTER_REQUIRED/);
});

test('Durable job driver composes with the actual private adapter and increments SQL fences',async t=>{
  const f=await fixture(t),before=await f.preserved(),store=new ClosureJobStore(':memory:',{mode:'local-rehearsal'});
  try{
    const job=store.create({ownerId:A,scope:f.context().scope,reviewed:true});let frozen=false;
    const adapter={...f.adapter,mode:'local-rehearsal',
      preflight:async c=>{if(frozen)await f.adapter.freeze(c);return {...binding(c),scopeMatches:true,billingSettled:true,privateWritesBlocked:frozen,publicationWritesBlocked:frozen,inFlightDrained:frozen};},
      freeze:async c=>{const r=await f.adapter.freeze(c);frozen=true;return r;},publication:async c=>({...binding(c),verified:true})};
    while(store.read(job.id).status!=='complete')assert.equal((await runNext(store,job.id,adapter)).result,'ADVANCED');
    assert.equal((await f.pg.query('select fence from public.account_closure_execution')).rows[0].fence,6);
    assert.equal(await f.preserved(),before);
  }finally{store.close();}
});

test('Interrupted Supabase/D1 closure resumes before deletion and completes both adapters without affecting B',async t=>{
  const f=await fixture(t),before=await f.preserved(),sql=new DatabaseSync(':memory:');let now=10000;
  const store=new ClosureJobStore(':memory:',{mode:'local-rehearsal',now:()=>now,retryMs:1});
  try{
    sql.exec('pragma foreign_keys=on;'+fs.readFileSync(path.join(__dirname,'../server/schema.sql'),'utf8'));
    sql.exec(fs.readFileSync(path.join(__dirname,'../server/proposals/account-closure-publication.sql'),'utf8'));
    for(const [owner,site] of [[A,'site-a'],[B,'site-a-long']]){
      sql.prepare('insert into sites values(?,?,?,?,?)').run(site,site+'.example.test',owner,'v1',1);
      sql.prepare('insert into published_versions values(?,?,?)').run(site,'v1',1);
      sql.prepare('insert into site_files values(?,?,?,?,?)').run('sites/'+site+'/v/v1/index.html',Buffer.from(owner),owner.length,'fixture','text/html');
    }
    const db={prepare(query){let values=[];const exec=()=>/^\s*select/i.test(query)?{results:sql.prepare(query).all(...values)}:{meta:{changes:Number(sql.prepare(query).run(...values).changes)}};
      const stmt={bind:(...v)=>{values=v;return stmt;},run:async()=>exec(),first:async()=>sql.prepare(query).get(...values),exec};return stmt;},
      async batch(stmts){sql.exec('begin');try{const rows=stmts.map(s=>s.exec());sql.exec('commit');return rows;}catch(e){sql.exec('rollback');throw e;}}};
    const pub=createPublicationClosure({db,backend:'d1'});
    const job=store.create({ownerId:A,scope:{...f.context().scope,siteIds:['site-a']},reviewed:true});
    let privateBound=false,pubBound=false,interrupt=true;
    const adapter={...f.adapter,mode:'local-rehearsal',
      preflight:async c=>{
        if(privateBound)await f.adapter.freeze(c);if(pubBound)await pub.freeze(c);
        return {...binding(c),scopeMatches:true,billingSettled:true,privateWritesBlocked:privateBound,publicationWritesBlocked:pubBound,inFlightDrained:privateBound&&pubBound};
      },
      freeze:async c=>{
        await f.adapter.freeze(c);privateBound=true;
        if(interrupt){interrupt=false;throw Error('SIMULATED_BETWEEN_SERVICES');}
        await pub.freeze(c);pubBound=true;return {...binding(c),verified:true};
      },publication:c=>pub.erase(c),
      verify:async c=>{await pub.erase(c);return f.adapter.verify(c);}};
    const stopped=await runNext(store,job.id,adapter);
    assert.equal(stopped.result,'STEP_FAILED');assert.equal(stopped.job.phase,'freeze');assert.equal(stopped.job.status,'retry');
    assert.equal((await f.pg.query('select count(*) n from public.account_closures where owner_id=$1',[A])).rows[0].n,1);
    assert.equal(sql.prepare('select count(*) n from publication_closures').get().n,0);
    assert.ok(f.calls.every(c=>!c.path.startsWith('/storage/')&&!c.path.startsWith('/auth/')),'no physical deletion before both guards');
    now+=2;
    while(store.read(job.id).status!=='complete')assert.equal((await runNext(store,job.id,adapter)).result,'ADVANCED');
    assert.equal(await f.preserved(),before);
    assert.equal(sql.prepare('select count(*) n from sites where owner_id=?').get(A).n,0);
    assert.ok(sql.prepare('select 1 from sites where owner_id=?').get(B));
    assert.equal(sql.prepare('select count(*) n from site_files').get().n,1);
    assert.equal((await f.pg.query('select count(*) n from auth.users where id=$1',[A])).rows[0].n,0);
    assert.equal(sql.prepare('select count(*) n from closed_publication_sites').get().n,1);
  }finally{store.close();sql.close();}
});
