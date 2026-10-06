const { test } = require('node:test'), assert = require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{createHash}=require('node:crypto');
const {createBackup,main}=require('../tools/backup-create.cjs');
const {verifyBackup}=require('../tools/backup-verify.cjs');
const {loadBackup,prepareAccountData}=require('../tools/account-data.cjs');
const {closurePlan}=require('../tools/backup-closures.cjs');
const A='a1111111-1111-4111-8111-111111111111', B='b2222222-2222-4222-8222-222222222222', C='c3333333-3333-4333-8333-333333333333';
// Match PostgREST's timestamp representation used in the production backup rows.
const T='2026-10-06T01:00:00.123456+00:00', NOW=new Date('2026-10-06T02:00:00.000Z');
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
const hash=b=>createHash('sha256').update(b).digest('hex');
const image=hash(bytes)+'.png';
const temp=()=>path.join(fs.mkdtempSync(path.join(os.tmpdir(),'templates-closures-')),'backup');
function state(){return {
  users:[A,B].map(id=>({id,email:id[0]+'@example.test',created_at:T,email_confirmed_at:T})),
  projects:[A,B].map(owner_id=>({owner_id,id:'shared-id',revision:1,updated_at:T,content:{name:'Restore '+owner_id[0],templateId:'cafe',values:owner_id===A?{'kontakt.html':{4:'templates-image:v1:'+image}}:{}}})),
  project_images:[{owner_id:A,name:image,created_at:T,content_key:image,state:'active',unused_since:null,lease_until:T,delete_token:null,retry_after:null,deleted_at:null}],
  project_image_refs:[{owner_id:A,project_id:'shared-id',image_name:image}],
  account_closures:[{owner_id:A,started_at:T},{owner_id:C,started_at:T}]
};}
function client(s,{error=null,afterDownload=()=>{},calls=[]}={}){return {
  from(table){const q={select:()=>q,order:()=>q,range:async(start,end)=>{
    calls.push(table); if(table==='account_closures'&&error)return {error:{code:error,message:'SECRET-MUST-NOT-LEAK'},data:null};
    return {data:s[table].slice(start,end+1),error:null};
  }};return q;},
  auth:{admin:{listUsers:async({page,perPage})=>({data:{users:s.users.slice((page-1)*perPage,page*perPage)},error:null})}},
  storage:{from:()=>({list:async(prefix,{offset,limit})=>({data:(prefix===''?[{name:A}]:[{name:image}]).slice(offset,offset+limit),error:null}),
    download:async()=>{afterDownload();return {data:new Blob([bytes]),error:null};}})}
};}
async function make(s=state(),options={}){const dir=temp();const m=await createBackup({client:client(s),destination:dir,sourceHost:'same.supabase.co',now:NOW,includeClosures:true,...options});return {dir,m};}
function rewriteManifest(dir,fn){const p=path.join(dir,'manifest.json'),m=JSON.parse(fs.readFileSync(p));fn(m);fs.writeFileSync(p,JSON.stringify(m));}

test('V2 captures every marker including deleted Auth identities and restores only open accounts',async()=>{
  const s=state(),calls=[];const {dir,m}=await make(s,{client:client(s,{calls}),pageSize:1});
  assert.equal(m.format,'templates-backup-v2');assert.equal(m.counts.account_closures,2);
  assert.equal(calls.filter(t=>t==='account_closures').length,6,'two complete paginated marker reads');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'db/account_closures.json'))),s.account_closures);
  const result=await verifyBackup(dir,{requireClosureProtection:true});
  assert.equal(result.fail,0,JSON.stringify(result.results.filter(r=>r.status==='FAIL')));
  assert.equal(result.closureProtection.markers,2);
  assert.deepEqual(result.closureProtection.skipped,{users:1,projects:1,project_images:1,project_image_refs:1,storageObjects:1});
  assert.equal(result.closureProtection.status,'CAPTURED_AS_OF_BACKUP');
  assert.equal(result.closureProtection.liveRestoreApproved,false);
  assert.ok(result.results.some(r=>r.area==='kontostängning'&&r.status==='PASS'));
});

test('Legacy backup still verifies but does not silently claim closure protection',async()=>{
  const {dir,m}=await make(state(),{includeClosures:false});assert.equal(m.format,'templates-backup-v1');
  const result=await verifyBackup(dir);assert.equal(result.fail,0);
  assert.equal(result.closureProtection.status,'UNKNOWN_LEGACY_WITHOUT_CLOSURES');
  await assert.rejects(verifyBackup(dir,{requireClosureProtection:true}),/saknar stängningsregister/);
});

test('Newer v2 from the same project protects a legacy backup and cannot reopen old guards',async()=>{
  const old=await make(state(),{includeClosures:false,now:new Date('2026-10-05T02:00:00Z')});
  const current=await make();
  const result=await verifyBackup(old.dir,{closureBackupDirectory:current.dir,requireClosureProtection:true});
  assert.equal(result.fail,0);assert.equal(result.closureProtection.skipped.users,1);
  const changed=state();changed.account_closures=[{owner_id:B,started_at:T}];
  const newer=await make(changed,{now:new Date('2026-10-07T02:00:00Z')});
  const plan=closurePlan(loadBackup(current.dir),loadBackup(newer.dir));
  assert.equal(plan.closures.length,3);assert.equal(plan.db.users.length,0);
  const merged=await verifyBackup(current.dir,{closureBackupDirectory:newer.dir,requireClosureProtection:true});
  assert.equal(merged.fail,0);assert.equal(merged.closureProtection.markers,3);
});

test('Wrong source, older marker backup, missing marker file and changed schema fail closed',async()=>{
  const base=await make();
  for(const options of [{sourceHost:'other.supabase.co'},{now:new Date('2026-10-05T02:00:00Z')}]){
    const newer=await make(state(),options);
    await assert.rejects(verifyBackup(base.dir,{closureBackupDirectory:newer.dir}),/samma källa|äldre/);
  }
  const missing=await make();fs.unlinkSync(path.join(missing.dir,'db/account_closures.json'));
  await assert.rejects(verifyBackup(missing.dir));
  const corrupt=await make();fs.appendFileSync(path.join(corrupt.dir,'db/account_closures.json'),' ');
  await assert.rejects(verifyBackup(corrupt.dir),/kontrollsumma/);
  const schema=await make();rewriteManifest(schema.dir,m=>{m.closureSchemaSha256='0'.repeat(64);});
  await assert.rejects(verifyBackup(schema.dir),/schemat skiljer/);
});

test('Marker permission/missing-table errors never downgrade v2 or reveal provider errors',async()=>{
  for(const error of ['42501','42P01','PGRST205']){
    const dest=temp();await assert.rejects(createBackup({client:client(state(),{error}),destination:dest,sourceHost:'same.supabase.co',includeClosures:true}),e=>/Ingen nedgradering/.test(e.message)&&!e.message.includes('SECRET'));
    assert.ok(!fs.existsSync(dest)&&!fs.existsSync(dest+'.partial'));
  }
});

test('Changed markers during capture leave only an incomplete folder',async()=>{
  const s=state(),dest=temp();
  await assert.rejects(createBackup({client:client(s,{afterDownload:()=>s.account_closures.push({owner_id:B,started_at:T})}),destination:dest,sourceHost:'same.supabase.co',includeClosures:true}),/ändrades under backupen/);
  assert.ok(!fs.existsSync(dest));assert.ok(fs.existsSync(dest+'.partial'));
});

test('Malformed or duplicate closure records cannot be captured; empty register is distinct from missing',async()=>{
  for(const markers of [[{owner_id:'../bad',started_at:T}],[{owner_id:A,started_at:'bad'}],[{owner_id:A,started_at:T},{owner_id:A,started_at:T}]]){
    const s=state();s.account_closures=markers;await assert.rejects(make(s),/kunde inte läsas/);
  }
  const s=state();s.account_closures=[];const {dir,m}=await make(s);
  assert.equal(m.counts.account_closures,0);
  const result=await verifyBackup(dir,{requireClosureProtection:true});assert.equal(result.fail,0);assert.equal(result.closureProtection.status,'CAPTURED_AS_OF_BACKUP');
});

test('V2 account export preserves open accounts and refuses automatic portable export of closed ones',async()=>{
  const {dir}=await make();const out=path.join(path.dirname(dir),'export');
  assert.throws(()=>prepareAccountData({backupDirectory:dir,ownerId:A,destination:out}),/markerat för stängning/);
  assert.ok(!fs.existsSync(out));
  const result=prepareAccountData({backupDirectory:dir,ownerId:B,destination:out});
  assert.equal(result.counts.projects,1);
  assert.ok(!fs.readFileSync(path.join(out,'account-data.json'),'utf8').includes(A));
});

test('CLI with-closures mode is explicit and refuses unknown flags',async()=>{
  const env={TEMPLATES_BACKUP_URL:'https://same.supabase.co',TEMPLATES_BACKUP_SECRET_KEY:'sb_secret_TEST_ONLY'};
  const dest=temp();const m=await main([dest,'--with-closures'],env,()=>()=>client(state()));assert.equal(m.format,'templates-backup-v2');
  await assert.rejects(main([temp(),'--ignore-closures'],env),/Använd/);
});
