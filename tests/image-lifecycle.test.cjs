// Real migration + worker orchestration in local Postgres. Storage removal below
// is ONLY a test fixture; hosted file deletion and concurrent connections need live QA.
const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {PGlite} = require('@electric-sql/pglite');
const {runImageCleanup} = require('../tools/cleanup-images.cjs');
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const key = n => n.toString(16).padStart(64,'0')+'.png';
const content = (...names) => ({name:'Testprojekt',templateId:'cafe',values:{'index.html':{1:'Hej'}},site:{pages:{'meny.html':{images:Object.fromEntries(names.map((name,i)=>[i,{src:'templates-image:v1:'+name}]))}}}});
test('Image lifecycle: migration, references, grace periods, claims, cleanup and recovery',async t=>{
  const db = new PGlite();
  try {
    await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(bucket_id text references storage.buckets(id),name text,primary key(bucket_id,name));
      alter table storage.objects enable row level security;
      grant usage on schema auth,storage,public to authenticated,anon,service_role;
      grant select,insert,update,delete on storage.objects to authenticated,anon;
      insert into auth.users values('${A}'),('${B}');`);
    const migrate = file => db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations',file),'utf8'));
    await migrate('202610030001_projects.sql'); await migrate('202610040001_private_images.sql');
    async function as(id,sql,args=[],role='authenticated') {
      await db.exec('set role '+role);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
      try{return (await db.query(sql,args)).rows;}finally{await db.exec('reset role');}
    }
    const reserve = async(id,image)=>(await as(id,'select public.reserve_project_image($1,$2) as result',[image,id]))[0].result;
    const upload = (id,name)=>as(id,"insert into storage.objects values('project-images',$1)",[id+'/'+name]);
    const save = (id,project,revision,...images)=>as(id,'select * from public.save_project($1,$2,$3,$4)',[project,content(...images),revision,id]);
    const remove = (id,project,revision)=>as(id,'select public.delete_project($1,$2,$3)',[project,revision,id]);
    const worker = (fn,args=[])=>as(null,'select * from public.'+fn,args,'service_role');
    const row = async(id,name)=>(await db.query('select * from public.project_images where owner_id=$1 and name=$2',[id,name])).rows[0];
    const age = (id,name)=>db.query("update public.project_images set unused_since=now()-interval '8 days',lease_until=now()-interval '1 day' where owner_id=$1 and name=$2",[id,name]);
    await reserve(A,key(1)); await upload(A,key(1)); await save(A,'legacy',0,key(1));
    await migrate('202610040002_image_lifecycle.sql');

    await t.test('migration preserves existing references and old immutable paths',async()=>{
      assert.equal((await row(A,key(1))).unused_since,null);
      assert.deepEqual(await reserve(A,key(1)),{name:key(1),uploaded:true});
      assert.equal((await db.query('select * from public.project_image_refs')).rows.length,1);
      assert.deepEqual(await worker('preview_project_image_cleanup(20)'),[]);
    });
    await t.test('clients cannot claim/finish cleanup, bypass wrappers or forge reference rows',async()=>{
      for(const role of ['anon','authenticated']) {
        await assert.rejects(as(A,'select * from public.claim_project_image_cleanup(20)',[],role),{code:'42501'});
        await assert.rejects(as(A,'select * from public.preview_project_image_cleanup(20)',[],role),{code:'42501'});
        await assert.rejects(as(A,'select public.finish_project_image_cleanup($1,$2,$3)',[A,key(1),A],role),{code:'42501'});
      }
      await assert.rejects(as(A,'select * from public.save_project_before_images($1,$2,0,$3)',['bypass',content(),A]),{code:'42501'});
      await assert.rejects(as(A,'delete from public.project_image_refs'),{code:'42501'});
      await assert.rejects(as(B,'select public.reserve_project_image($1,$2)',[key(1),A]),{code:'42501'});
      await assert.rejects(worker('claim_project_image_cleanup(26)'),{code:'22023'});
    });
    await t.test('bad, missing or foreign references reject the whole project transaction',async()=>{
      await assert.rejects(save(A,'broken',0,key(999)),{code:'PT410'});
      await assert.rejects(save(A,'broken',0,'../image.png'),{code:'PT410'});
      await assert.rejects(save(B,'foreign',0,key(1)),{code:'PT410'});
      assert.deepEqual(await as(A,"select * from public.projects where id='broken'"),[]);
    });
    let shared;
    await t.test('shared image stays protected until its last project releases it',async()=>{
      shared=(await reserve(A,key(2))).name;
      assert.match(shared,/^[a-f0-9]{64}-[a-f0-9]{32}\.png$/);
      await upload(A,shared); await save(A,'one',0,shared); await save(A,'two',0,shared);
      await remove(A,'one',1); assert.equal((await row(A,shared)).unused_since,null);
      assert.deepEqual(await worker('preview_project_image_cleanup(20)'),[]);
      await remove(A,'two',1); assert.ok((await row(A,shared)).unused_since);
      assert.deepEqual(await worker('preview_project_image_cleanup(20)'),[]);
    });
    await t.test('seven-day grace and renewed upload lease both prevent cleanup',async()=>{
      await db.query("update public.project_images set unused_since=now()-interval '8 days' where name=$1",[shared]);
      assert.deepEqual(await worker('preview_project_image_cleanup(20)'),[]);
      await age(A,shared); assert.equal((await worker('preview_project_image_cleanup(20)')).length,1);
      assert.equal((await as(A,'select public.project_image_upload_allowed($1) as allowed',[A+'/'+shared]))[0].allowed,false);
      await reserve(A,key(2)); assert.deepEqual(await worker('preview_project_image_cleanup(20)'),[]);
      assert.equal((await as(A,'select public.project_image_upload_allowed($1) as allowed',[A+'/'+shared]))[0].allowed,true);
    });
    let claim, replacement;
    await t.test('claim wins: old path cannot be attached or uploaded; new generation can be saved',async()=>{
      await age(A,shared); [claim]=await worker('claim_project_image_cleanup(20)');
      assert.equal(claim.name,shared); assert.deepEqual(await worker('claim_project_image_cleanup(20)'),[]);
      await assert.rejects(save(A,'late',0,shared),{code:'PT410'});
      // RLS rejects the path even if a stale uploader completes after the claim.
      assert.equal((await as(A,'select public.project_image_upload_allowed($1) as allowed',[A+'/'+shared]))[0].allowed,false);
      replacement=(await reserve(A,key(2))).name; assert.notEqual(replacement,shared);
      await upload(A,replacement); await save(A,'new-generation',0,replacement);
    });
    await t.test('claim token and confirmed Storage absence required before quota release',async()=>{
      await assert.rejects(worker('finish_project_image_cleanup($1,$2,$3)',[A,shared,B]),{code:'PT409'});
      assert.equal((await worker('finish_project_image_cleanup($1,$2,$3)',[A,shared,claim.delete_token]))[0].finish_project_image_cleanup,false);
      assert.equal((await row(A,shared)).state,'deleting');
      // Simulates Storage API completion; production worker never deletes SQL metadata itself.
      await db.query("delete from storage.objects where bucket_id='project-images' and name=$1",[A+'/'+shared]);
      assert.equal((await worker('finish_project_image_cleanup($1,$2,$3)',[A,shared,claim.delete_token]))[0].finish_project_image_cleanup,true);
      assert.equal((await row(A,shared)).state,'deleted');
      assert.equal((await worker('finish_project_image_cleanup($1,$2,$3)',[A,shared,claim.delete_token]))[0].finish_project_image_cleanup,true);
      assert.equal((await row(A,replacement)).state,'active');
      assert.equal((await db.query('select * from storage.objects where name=$1',[A+'/'+replacement])).rows.length,1);
      await assert.rejects(upload(A,shared),{code:'42501'});
    });
    await t.test('save wins: a newly referenced image disappears from cleanup candidates',async()=>{
      const image=(await reserve(A,key(3))).name; await upload(A,image); await age(A,image);
      assert.equal((await worker('preview_project_image_cleanup(20)')).length,1);
      await save(A,'rescued',0,image);
      assert.deepEqual(await worker('claim_project_image_cleanup(20)'),[]);
      await assert.rejects(save(A,'rescued',0),{code:'PT409'});
      assert.equal((await row(A,image)).unused_since,null);
    });
    await t.test('worker dry run does not claim; failed removal retains quota and retry completes',async()=>{
      const image=(await reserve(B,key(4))).name; await upload(B,image); await age(B,image);
      let fail=true, removals=0;
      const client={rpc:async(fn,args)=>{
        if(fn==='finish_project_image_cleanup')return {data:(await worker(fn+'($1,$2,$3)',[args.p_owner,args.p_name,args.p_token]))[0][fn]};
        return {data:await worker(fn+'($1)',[args.p_limit])};
      },storage:{from:bucket=>({remove:async paths=>{
        assert.equal(bucket,'project-images'); removals++;
        if(fail)return {error:{message:'Synthetic outage'}};
        await db.query('delete from storage.objects where bucket_id=$1 and name=$2',[bucket,paths[0]]); return {data:[]};
      }})}};
      assert.equal((await runImageCleanup(client)).selected,1); assert.equal(removals,0);
      assert.equal((await row(B,image)).state,'active');
      assert.equal((await runImageCleanup(client,{dryRun:false})).failed,1);
      assert.equal((await row(B,image)).state,'deleting');
      const token=(await row(B,image)).delete_token;
      assert.equal((await runImageCleanup(client,{dryRun:false})).selected,0);
      await db.query("update public.project_images set retry_after=now()-interval '1 minute' where name=$1",[image]);
      fail=false; assert.equal((await runImageCleanup(client,{dryRun:false})).removed,1);
      assert.equal((await row(B,image)).delete_token,token); assert.equal((await row(B,image)).state,'deleted');
      assert.equal((await row(A,key(1))).state,'active');
    });
    await t.test('quota counts pending deletions and releases only confirmed deleted generations',async()=>{
      for(let n=1000;n<1100;n++)await reserve(B,key(n));
      await assert.rejects(reserve(B,key(1100)),{code:'PT413'});
      const image=(await reserve(B,key(1000))).name; await age(B,image);
      const [job]=await worker('claim_project_image_cleanup(20)');
      await assert.rejects(reserve(B,key(1000)),{code:'PT413'});
      await worker('finish_project_image_cleanup($1,$2,$3)',[B,image,job.delete_token]);
      const next=await reserve(B,key(1000)); assert.notEqual(next.name,image);
      assert.equal((await db.query("select count(*)::int n from public.project_images where owner_id=$1 and state<>'deleted'",[B])).rows[0].n,100);
    });
  } finally {await db.close();}
});

test('Worker validates all claims before removal; malformed paths and missing confirmation fail closed',async()=>{
  let removes=0, finishes=0;
  const valid={owner_id:A,name:key(1),delete_token:B};
  const client={rpc:async fn=>fn==='finish_project_image_cleanup'?(finishes++,{data:false}):{data:[valid,{...valid,name:'../other'}]},
    storage:{from:()=>({remove:async()=>{removes++;return {data:[]};}})}};
  await assert.rejects(runImageCleanup(client,{dryRun:false}),/Invalid cleanup claim/); assert.equal(removes,0);
  client.rpc=async fn=>fn==='finish_project_image_cleanup'?(finishes++,{data:false}):{data:[valid]};
  const result=await runImageCleanup(client,{dryRun:false});
  assert.equal(result.failed,1);assert.equal(result.removed,0);assert.equal(finishes,1);
  await assert.rejects(runImageCleanup(client,{limit:100}),/Invalid cleanup options/);
});
