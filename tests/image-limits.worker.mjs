// Real local D1 adapter boundary checks. Never connects to Cloudflare.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv[2])throw new Error('Provide the existing worker-tools directory');
const tools=createRequire(path.resolve(process.argv[2],'package.json'));
const {Miniflare}=tools('miniflare');
const built=await tools('esbuild').build({stdin:{resolveDir:root,contents:`
  import { d1Bucket } from './server/worker.mjs';
  export default { async fetch(request,env) {
    const size=Number(new URL(request.url).pathname.slice(1));
    try { await d1Bucket(env.DB).put('synthetic-boundary',new Uint8Array(size),{contentType:'image/png',sha256:'synthetic'});return Response.json({stored:size}); }
    catch(error){return Response.json({code:error.code,error:error.message},{status:error.code==='image'?422:500});}
  }};`},bundle:true,format:'esm',platform:'neutral',target:'es2022',mainFields:['module','main'],conditions:['worker','import'],loader:{'.woff2':'binary','.txt':'text'},write:false,logLevel:'silent'});
const mf=new Miniflare({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-08-01',d1Databases:['DB']});
const results=[];
try{
  const db=await mf.getD1Database('DB');
  for(const sql of fs.readFileSync(path.join(root,'server/schema.sql'),'utf8').replace(/--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  for(const size of [1899999,1900000,1900001]){
    const response=await mf.dispatchFetch('https://local.test/'+size),body=await response.json();
    assert.equal(response.status,size>1900000?422:200,JSON.stringify(body));
    const stored=await db.prepare('select size from site_files where key=?').bind('synthetic-boundary').first();
    assert.equal(stored.size,Math.min(size,1900000));
    if(size>1900000){assert.equal(body.code,'image');assert.match(body.error,/1,9 MB/);}
    results.push({bytes:size,httpStatus:response.status,storedBytes:stored.size,status:'PASS'});
  }
}finally{await mf.dispose();}
console.log(JSON.stringify({runtime:'LOCAL workerd/D1, synthetic raw byte boundary fixture',results},null,2));
