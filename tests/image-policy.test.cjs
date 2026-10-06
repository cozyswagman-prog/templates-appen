const { test } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const policy = require('../js/image-policy.js');
const { createPublisher, memoryStores } = require('../server/publisher.mjs');
const { handlePublishRequest } = require('../server/publish-api.mjs');
const photo = (width=40,height=20) => sharp({create:{width,height,channels:4,background:{r:20,g:80,b:140,alpha:.5}}});
const data = (bytes,ext='png') => 'data:image/'+ext+';base64,'+bytes.toString('base64');

test('Publication policy accepts small canonical PNG/JPEG and rejects metadata and oversize dimensions', async () => {
  for (const ext of ['png','jpeg']) {
    const bytes = await photo().toFormat(ext).toBuffer();
    assert.equal(policy.validate(bytes,ext).width,40);
    const tagged = await photo().withMetadata({orientation:6}).toFormat(ext).toBuffer();
    assert.throws(()=>policy.validate(tagged,ext),{code:'image'});
    const large = await photo(1601,1).toFormat(ext).toBuffer();
    assert.throws(()=>policy.validate(large,ext),/1600/);
  }
});
test('Input headers identify WebP/GIF but publication requires a static normalized image', async () => {
  for (const ext of ['webp','gif']) {
    const bytes = await photo().toFormat(ext).toBuffer();
    assert.equal(policy.inspect(bytes,ext).width,40);
    assert.throws(()=>policy.validate(bytes,ext),{code:'image'});
  }
});
test('Metadata stripping preserves decoded pixels after normalization', async () => {
  for (const ext of ['png','jpeg']) {
    const encoded=await photo().withMetadata({orientation:1}).toFormat(ext).toBuffer();
    const stripped=policy.stripMetadata(encoded,ext);
    policy.validate(stripped,ext);
    const metadata=await sharp(stripped).metadata();
    assert.equal(metadata.exif,undefined);assert.equal(metadata.icc,undefined);assert.equal(metadata.orientation,undefined);
    assert.deepEqual(await sharp(stripped).raw().toBuffer(),await sharp(encoded).raw().toBuffer());
  }
});
test('Malformed containers, wrong format and appended data are refused', async () => {
  for (const ext of ['png','jpeg']) {
    const bytes = await photo().toFormat(ext).toBuffer();
    for (const bad of [bytes.subarray(0,bytes.length-2),Buffer.concat([bytes,Buffer.from('hidden metadata')])])
      assert.throws(()=>policy.validate(bad,ext),{code:'image'});
    assert.throws(()=>policy.validate(bytes,ext==='png'?'jpeg':'png'),{code:'image'});
  }
  const broken=await photo().png().toBuffer();broken.writeUInt32BE(0xffffffff,8);
  assert.throws(()=>policy.validate(broken,'png'),{code:'image'});
});
test('A real oversized PNG is refused by authenticated publication before writes; active site stays intact', async () => {
  const {bucket,sites}=memoryStores();await sites.create('image-cafe','image.test','owner');
  const publisher=createPublisher({bucket,sites,render:p=>new Map([['index.html',p.name]])});
  const small=await photo().png().toBuffer();
  let project={name:'Before',templateId:'cafe',values:{'index.html':{1:data(small)}}};
  const call=()=>handlePublishRequest(new Request('https://api.test/api/publish',{method:'POST',headers:{Authorization:'Bearer synthetic',Origin:'https://app.test','Content-Type':'application/json'},body:JSON.stringify({siteId:'image-cafe',projectId:'image-project'})}),{
    env:{APP_ORIGIN:'https://app.test',REQUIRE_PLAN:'1'},sites,publisher,billing:{plan:async()=>({active:true})},source:{getUser:async()=>({id:'owner'}),loadProject:async()=>({project,revision:1})}});
  assert.equal((await call()).status,200);const before=await sites.get('image-cafe'),count=bucket.keys().length;
  const oversized=await photo(800,800).removeAlpha().png({compressionLevel:0}).toBuffer();
  assert.ok(oversized.length>1900000 && oversized.length<2*1024*1024);
  project={...project,name:'After',values:{'index.html':{1:data(oversized)}}};
  let response=await call();assert.equal(response.status,422);assert.match((await response.json()).error,/1,9 MB/);
  const metadata=await photo().withMetadata({orientation:6}).jpeg().toBuffer();
  project.values={'index.html':{1:data(metadata,'jpeg')}};
  response=await call();assert.equal(response.status,422);assert.equal((await response.json()).code,'image');
  assert.deepEqual(await sites.get('image-cafe'),before);assert.equal(bucket.keys().length,count);
});
