// Ephemeral local workerd + D1. No deployment, credentials, customer data or Stripe.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createPublicationClosure} from '../server/account-closure-publication.mjs';
import {d1Bucket,d1Sites} from '../server/d1-publication-stores.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv[2])throw Error('Provide existing worker-tools directory; nothing is installed.');
const tools=createRequire(path.resolve(process.argv[2],'package.json'));
const {Miniflare}=tools('miniflare');
const built=await tools('esbuild').build({entryPoints:[path.join(root,'server/worker.mjs')],bundle:true,format:'esm',platform:'neutral',target:'es2022',mainFields:['module','main'],conditions:['worker','import'],loader:{'.woff2':'binary','.txt':'text'},write:false,logLevel:'silent'});
const options={modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-08-01',d1Databases:['DB'],
  bindings:{CONTROL_HOST:'control.test',CONTROL_TOKEN:'synthetic-local-only',SITES_PATH_HOST:'sites.test',ACCOUNT_CLOSURE_ENABLED:'1'}};
const mf=new Miniflare(options),results=[];
const check=(name,ok)=>{assert.ok(ok,name);results.push({check:name,status:'PASS'});};
const owner='11111111-1111-4111-8111-111111111111';
const c={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',ownerId:owner,scopeHash:'a'.repeat(64),fence:1,scope:{siteIds:['closed-cafe']}};
const control=(route,data)=>mf.dispatchFetch('https://control.test'+route,{method:'POST',headers:{Authorization:'Bearer synthetic-local-only','Content-Type':'application/json'},body:JSON.stringify(data)});
try{
  const db=await mf.getD1Database('DB');
  const base=fs.readFileSync(path.join(root,'server/schema.sql'),'utf8').replace(/--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean);
  for(const s of base)await db.prepare(s).run();
  // This proposal consists only of CREATE statements. Keep each trigger body
  // whole rather than splitting its internal semicolons.
  const proposal=fs.readFileSync(path.join(root,'server/proposals/account-closure-publication.sql'),'utf8').replace(/--.*$/gm,'').split(/;\s*(?=create\b|$)/i).map(s=>s.trim()).filter(Boolean);
  for(const s of proposal)await db.prepare(s).run();
  const project={name:'Synthetic closure cafe',templateId:'cafe',values:{'index.html':{3:'Local only'}}};
  for(const [id,ownerId] of [['closed-cafe',owner],['closed-cafe-long','22222222-2222-4222-8222-222222222222']]){
    check('Create '+id,(await control('/sites',{id,host:'sites.test/'+id,ownerId})).status===201);
    check('Publish '+id,(await control('/sites/'+id+'/publish',{project})).status===200);
  }
  const first=await mf.dispatchFetch('https://sites.test/closed-cafe/');check('Public before closure',first.status===200);
  const html=await first.text(),asset=html.match(/(?:src|href)="(_v\/[^"\s]+\/(?:fonts|images)\/[^"\s]+)"/)?.[1];assert.ok(asset);
  const closure=createPublicationClosure({db,backend:'d1'});await closure.freeze(c);
  check('Public HTML hidden',(await mf.dispatchFetch('https://sites.test/closed-cafe/')).status===404);
  check('Pinned asset hidden',(await mf.dispatchFetch('https://sites.test/closed-cafe/'+asset)).status===404);
  check('Other owner public',(await mf.dispatchFetch('https://sites.test/closed-cafe-long/')).status===200);
  await assert.rejects(d1Bucket(db).put('sites/closed-cafe/v/late/index.html',new Uint8Array([1]),{contentType:'text/html',sha256:'test'}),/ACCOUNT_CLOSED/);check('Late D1 file rejected',true);
  await closure.freeze({...c,fence:2});await assert.rejects(closure.erase(c),{code:'closure-conflict'});check('Stale deletion rejected',true);
  await db.prepare("create trigger failure_test before delete on published_versions begin select raise(abort,'SIMULATED_FAILURE'); end").run();
  const before=await db.prepare('select count(*) n from site_files').first();
  await assert.rejects(closure.erase({...c,fence:2}),/SIMULATED_FAILURE/);
  check('D1 batch rolls back file deletes',(await db.prepare('select count(*) n from site_files').first()).n===before.n);
  await db.prepare('drop trigger failure_test').run();check('D1 erase verified',(await closure.erase({...c,fence:2})).verified);
  await assert.rejects(d1Sites(db).create('closed-cafe','reused.test',null),{code:'account-closed'});check('Deleted site id cannot return',true);
  check('Other owner still public after erase',(await mf.dispatchFetch('https://sites.test/closed-cafe-long/')).status===200);
  check('Closure marker retained',(await db.prepare('select count(*) n from publication_closures').first()).n===1);
}finally{await mf.dispose();}
const r2=new Miniflare({...options,r2Buckets:['SITES']});
try{check('R2 activation refused',(await r2.dispatchFetch('https://sites.test/')).status===503);}finally{await r2.dispose();}
console.log(JSON.stringify({mode:'LOCAL_WORKERD_D1_ONLY',pass:results.length,fail:0,results},null,2));
