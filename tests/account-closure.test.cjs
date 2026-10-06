// Rehearsal on real local Postgres/SQLite schemas. Auth, Storage deletion and D1
// hosting are fixtures. No cloud clients, customer backup or production writes.
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { DatabaseSync } = require('node:sqlite');
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const key=n=>n.toString(16).padStart(64,'0')+'.png';
const project=name=>({name:'Kontoprov ÅÄÖ',templateId:'cafe',values:{'kontakt.html':{4:'templates-image:v1:'+name}}});

test('Account closure proposal: isolation, stale session, partial erasure and restore guard',async t=>{
  const pg=new PGlite(), d1=new DatabaseSync(':memory:'), bytes=new Map();
  const count=async(table,owner)=>Number((await pg.query(`select count(*) n from ${table} where ${table==='auth.users'?'id':'owner_id'}=$1`,[owner])).rows[0].n);
  const as=async(id,sql,args=[],role='authenticated')=>{
    await pg.exec('set role '+role);
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
    try{return(await pg.query(sql,args)).rows;}finally{await pg.exec('reset role');}
  };
  try{
    await pg.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated;
      create schema storage; grant usage on schema storage to anon,authenticated,service_role;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(bucket_id text references storage.buckets(id),name text,primary key(bucket_id,name));
      alter table storage.objects enable row level security;
      grant select,insert,update,delete on storage.objects to anon,authenticated;
      insert into auth.users values('${A}'),('${B}');`);
    const dir=path.join(__dirname,'../supabase/migrations');
    for(const name of fs.readdirSync(dir).sort())await pg.exec(fs.readFileSync(path.join(dir,name),'utf8'));
    await pg.exec(fs.readFileSync(path.join(__dirname,'../supabase/proposals/account-closure.sql'),'utf8'));
    d1.exec('pragma foreign_keys=ON;'+fs.readFileSync(path.join(__dirname,'../server/schema.sql'),'utf8'));
    const names={};
    for(const [owner,n] of [[A,1],[B,2]]){
      const r=(await as(owner,'select public.reserve_project_image($1,$2) r',[key(n),owner]))[0].r;
      names[owner]=r.name;
      await as(owner,'insert into storage.objects values($1,$2)',['project-images',owner+'/'+r.name]);
      bytes.set(owner+'/'+r.name,Buffer.from('private '+owner));
      await as(owner,'select * from public.save_project($1,$2,0,$3)',['same-id',project(r.name),owner]);
      const site=owner===A?'site-a':'site-a-long';
      d1.prepare('insert into sites values(?,?,?,?,?)').run(site,site+'.example.test',owner,'v1',1);
      d1.prepare('insert into published_versions values(?,?,?)').run(site,'v1',1);
      d1.prepare('insert into version_retirements values(?,?,?)').run(site,'old',0);
      for(const version of ['v1','old','unfinished'])d1.prepare('insert into site_files values(?,?,?,?,?)').run('sites/'+site+'/v/'+version+'/index.html',Buffer.from(owner),owner.length,'test','text/html');
      d1.prepare('insert into subscriptions values(?,?,?,?,?,?,?,?)').run('sub-'+site,owner,'cus-'+site,'active',1,9999999999,0,1);
      d1.prepare('insert into checkout_links values(?,?)').run('sub-'+site,owner);
    }
    await as(A,'select * from public.save_project($1,$2,0,$3)',['second-project',project(names[A]),A]);
    const unused=(await as(A,'select public.reserve_project_image($1,$2) r',[key(3),A]))[0].r.name;
    await as(A,'insert into storage.objects values($1,$2)',['project-images',A+'/'+unused]); bytes.set(A+'/'+unused,Buffer.from('unused-A'));
    d1.prepare('insert into site_files values(?,?,?,?,?)').run('sites/unknown-owner/v/pending/file.txt',Buffer.from('unattributed'),12,'test','text/plain');
    d1.prepare('insert into billing_events values(?,?,?,?,?)').run('evt-unattributed','customer.subscription.updated',1,'accepted','2026-10-06');
    // Reserved but not yet uploaded: must not become an escape during closure.
    const pending=(await as(A,'select public.reserve_project_image($1,$2) r',[key(4),A]))[0].r.name;
    const preserved=async()=>JSON.stringify({
      auth:(await pg.query('select * from auth.users where id=$1',[B])).rows,
      projects:(await pg.query('select * from public.projects where owner_id=$1',[B])).rows,
      images:(await pg.query('select * from public.project_images where owner_id=$1',[B])).rows,
      refs:(await pg.query('select * from public.project_image_refs where owner_id=$1',[B])).rows,
      objects:[...bytes].filter(([p])=>p.startsWith(B+'/')),
      sites:d1.prepare('select * from sites where owner_id=?').all(B),
      versions:d1.prepare("select * from published_versions where site_id='site-a-long'").all(),
      retirements:d1.prepare("select * from version_retirements where site_id='site-a-long'").all(),
      files:d1.prepare("select * from site_files where substr(key,1,13)<>'sites/site-a/' order by key").all(),
      billingEvents:d1.prepare('select * from billing_events order by id').all(),
      subscriptions:d1.prepare('select * from subscriptions where user_id=?').all(B),
      links:d1.prepare('select * from checkout_links where user_id=?').all(B)
    });
    const beforeB=await preserved();

    await t.test('Customers and anonymous cannot close accounts or read/remove closure markers',async()=>{
      assert.deepEqual(await as(null,'select * from public.account_closures',[],'service_role'),[],'backup role has read-only marker access');
      for(const [role,id] of [['authenticated',A],['authenticated',B],['anon',null]]){
        await assert.rejects(as(id,'select public.begin_account_closure($1)',[A],role),{code:'42501'});
        await assert.rejects(as(id,'select * from public.account_closures',[],role),{code:'42501'});
        await assert.rejects(as(id,'delete from public.account_closures',[],role),{code:'42501'});
      }
    });
    await t.test('Local preflight refuses active/unknown subscription status before closure',async()=>{
      const preflight=()=>{if(d1.prepare("select 1 from subscriptions where user_id=? and status not in ('canceled','incomplete_expired')").get(A))throw Error('BILLING_REVIEW_REQUIRED');};
      assert.throws(preflight,/BILLING_REVIEW/); assert.equal(await count('public.account_closures',A),0);
      d1.prepare("update subscriptions set status='unknown' where user_id=?").run(A); assert.throws(preflight,/BILLING_REVIEW/);
      d1.prepare("update subscriptions set status='canceled' where user_id=?").run(A); preflight(); // synthetic only, never Stripe
    });
    await t.test('Unknown account is rejected and service_role cannot remove or forge the guard',async()=>{
      await assert.rejects(as(null,'select public.begin_account_closure($1)',['33333333-3333-4333-8333-333333333333'],'service_role'),{code:'PT404'});
      await assert.rejects(as(null,'select public.begin_account_closure($1)',[null],'service_role'),{code:'22023'});
      await assert.rejects(as(null,'insert into public.account_closures(owner_id) values($1)',[A],'service_role'),{code:'42501'});
      await assert.rejects(as(null,'delete from public.account_closures',[],'service_role'),{code:'42501'});
    });
    await t.test('Operator closure is idempotent and hides private data from an existing session',async()=>{
      await as(null,'select public.begin_account_closure($1)',[A],'service_role');
      const started=(await pg.query('select started_at from public.account_closures where owner_id=$1',[A])).rows[0];
      await as(null,'select public.begin_account_closure($1)',[A],'service_role');
      assert.deepEqual((await pg.query('select started_at from public.account_closures where owner_id=$1',[A])).rows[0],started);
      for(const table of ['public.projects','public.project_images','storage.objects'])assert.deepEqual(await as(A,'select * from '+table),[]);
      assert.equal((await as(B,'select * from public.projects')).length,1);
      assert.equal((await as(B,'select * from storage.objects')).length,1);
    });
    await t.test('Existing session cannot save, delete, reserve or finish a pending upload',async()=>{
      for(const sqlArgs of [
        ['select * from public.save_project($1,$2,$3,$4)',['same-id',project(names[A]),1,A]],
        ['select * from public.save_project($1,$2,$3,$4)',['new-id',project(names[A]),0,A]],
        ['select public.delete_project($1,$2,$3)',['same-id',1,A]],
        ['select public.reserve_project_image($1,$2)',[key(1),A]],
        ['select public.reserve_project_image($1,$2)',[key(5),A]],
        ['insert into storage.objects values($1,$2)',['project-images',A+'/'+pending]]
      ])await assert.rejects(as(A,...sqlArgs),{code:'PT423'});
      assert.equal(await count('public.projects',A),2);
      assert.equal(await preserved(),beforeB);
    });
    // Local-only rehearsal: no live adapters. A real coordinator must stop writes
    // across services, validate an approved scope and checkpoint each phase.
    const eraseLocal=async(failStorage=false)=>{
      assert.equal(await count('public.account_closures',A),1);
      const sites=d1.prepare('select id from sites where owner_id=?').all(A);
      d1.exec('begin');
      try{
        for(const {id} of sites){
          const prefix='sites/'+id+'/';
          d1.prepare('delete from site_files where substr(key,1,?)=?').run(prefix.length,prefix);
          d1.prepare('delete from published_versions where site_id=?').run(id);
          d1.prepare('delete from version_retirements where site_id=?').run(id);
          d1.prepare('delete from sites where id=? and owner_id=?').run(id,A);
        }
        d1.prepare('delete from checkout_links where user_id=?').run(A);
        d1.prepare('delete from subscriptions where user_id=?').run(A);
        d1.exec('commit');
      }catch(e){d1.exec('rollback');throw e;}
      let removed=0;
      for(const object of [...bytes.keys()].filter(p=>p.startsWith(A+'/'))){
        bytes.delete(object); // fake Storage service owns both bytes and metadata
        await pg.query('delete from storage.objects where bucket_id=$1 and name=$2',['project-images',object]);
        if(failStorage&&++removed===1)throw Error('SIMULATED_STORAGE_FAILURE');
      }
      assert.equal([...bytes.keys()].filter(p=>p.startsWith(A+'/')).length,0);
      await pg.exec('begin');
      try{
        await pg.query('delete from public.projects where owner_id=$1',[A]);
        await pg.query('delete from public.project_images where owner_id=$1',[A]);
        await pg.query('delete from auth.users where id=$1',[A]);
        await pg.exec('commit');
      }catch(e){await pg.exec('rollback');throw e;}
    };
    await t.test('Partial Storage failure keeps Auth and the closure marker; other account unchanged',async()=>{
      await assert.rejects(eraseLocal(true),/SIMULATED_STORAGE_FAILURE/);
      assert.equal(await count('auth.users',A),1); assert.equal(await count('public.account_closures',A),1);
      assert.equal([...bytes.keys()].filter(p=>p.startsWith(A+'/')).length,1);
      assert.equal(d1.prepare("select count(*) n from site_files where substr(key,1,13)='sites/site-a/'").get().n,0);
      assert.equal(await preserved(),beforeB);
    });
    await t.test('Retry removes all selected local records, files and unfinished versions only once',async()=>{
      await eraseLocal(); await eraseLocal();
      for(const table of ['auth.users','public.projects','public.project_images','public.project_image_refs'])assert.equal(await count(table,A),0);
      assert.equal((await pg.query('select * from storage.objects where name like $1',[A+'/%'])).rows.length,0);
      assert.equal(d1.prepare('select count(*) n from sites where owner_id=?').get(A).n,0);
      assert.equal(d1.prepare('select count(*) n from subscriptions where user_id=?').get(A).n,0);
      assert.equal(d1.prepare('select count(*) n from checkout_links where user_id=?').get(A).n,0);
      assert.equal(await preserved(),beforeB);
    });
    await t.test('A stale token and restoring an old account cannot bypass the persistent closure marker',async()=>{
      assert.deepEqual(await as(A,'select * from public.projects'),[]);
      await pg.query('insert into auth.users values($1)',[A]); // simulate stale backup identity
      await assert.rejects(as(A,'select * from public.save_project($1,$2,0,$3)',['returning',{name:'Old backup',templateId:'cafe',values:{}},A]),{code:'PT423'});
      await assert.rejects(pg.query('insert into public.projects(owner_id,id,content) values($1,$2,$3)',[A,'restored',{name:'Old backup',templateId:'cafe',values:{}}]),{code:'PT423'});
      await pg.query('delete from auth.users where id=$1',[A]);
      assert.equal(await count('public.account_closures',A),1); assert.equal(await preserved(),beforeB);
    });
  }finally{d1.close();await pg.close();}
});
