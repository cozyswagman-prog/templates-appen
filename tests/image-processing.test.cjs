const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const sharp=require('sharp'),{DOMParser}=require('linkedom');
const {preparePublication}=require('../tools/prepare-publication.cjs');
const {renderProject}=require('../tools/render-project.cjs');
const data=(bytes,type='png')=>'data:image/'+type+';base64,'+bytes.toString('base64');
const project=src=>({name:'Bildprov ÅÄÖ',templateId:'cafe',values:{'index.html':{'2':src},'kontakt.html':{'4':src}}});
const pixel=()=>sharp({create:{width:20,height:10,channels:4,background:{r:15,g:140,b:70,alpha:0.4}}}).png().toBuffer();
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
test('Re-encodes numbered/named multipage images once, preserves text/alt/focus and caller input',async()=>{
  const source=data(await pixel()),input=project(source);
  input.site={pages:{'kontakt.html':{images:{'original-0':{src:source,alt:'Egen bild ÅÄÖ',focus:'top'}}}}};
  input.values['index.html']['3']='data:image/png;base64,ordinary customer text';
  const before=JSON.stringify(input),result=await preparePublication({app:'templates',version:1,project:input});
  assert.equal(JSON.stringify(input),before); assert.equal(result.imageReport.length,1);
  const images=[...result.files].filter(([name])=>name.startsWith('images/'));
  assert.equal(images.length,1); assert.match(images[0][0],/\.webp$/);
  const meta=await sharp(images[0][1]).metadata();
  assert.equal(meta.format,'webp');assert.equal(meta.width,20);assert.equal(meta.height,10);assert.equal(meta.hasAlpha,true);
  assert.equal(meta.exif,undefined);assert.equal(meta.xmp,undefined);assert.equal(meta.icc,undefined);
  const doc=new DOMParser().parseFromString(result.files.get('kontakt.html'),'text/html');
  assert.equal(doc.querySelector('img').getAttribute('alt'),'Egen bild ÅÄÖ');
  assert.equal(doc.querySelector('img').style.objectPosition,'top');
  assert.ok(result.files.get('index.html').includes('ordinary customer text'));
});
test('EXIF orientation is applied, private metadata/trailing bytes removed and dimensions bounded',async()=>{
  const bytes=await sharp({create:{width:1800,height:900,channels:3,background:'red'}})
    .jpeg().withMetadata({orientation:6}).withExifMerge({IFD0:{Artist:'PRIVATE-TEST-METADATA'}}).toBuffer();
  assert.equal((await sharp(bytes).metadata()).orientation,6);
  const result=await preparePublication(project(data(Buffer.concat([bytes,Buffer.from('PRIVATE-TRAILING-PAYLOAD')]),'jpeg')));
  const output=[...result.files].find(([key])=>key.endsWith('.webp'))[1],meta=await sharp(output).metadata();
  assert.equal(meta.width,800);assert.equal(meta.height,1600);assert.equal(meta.orientation,undefined);
  assert.equal(meta.exif,undefined);assert.ok(!output.includes(Buffer.from('PRIVATE')));
});
test('Single-frame GIF and WebP are decoded; legacy flat slots stay supported',async()=>{
  for(const format of ['gif','webp']) {
    const bytes=await sharp(await pixel()).toFormat(format).toBuffer();
    const input=project(data(bytes,format));input.values=input.values['index.html'];
    const result=await preparePublication(input);
    assert.equal(result.imageReport.length,1);assert.equal(result.imageReport[0].format,'webp');
  }
});
test('All nine templates without customer images retain their exact rendering',async()=>{
  for(const templateId of ['restaurang','salong','byggfirma','butik','portfolio','cafe','gym','konsult','hemservice']) {
    const input={name:'Mallprov',templateId,values:{}};
    const result=await preparePublication(input);
    assert.deepEqual([...result.files],[...renderProject(input)]);assert.deepEqual(result.imageReport,[]);
  }
});
test('Rejects SVG, remote URLs, private refs, wrong MIME, oversized bytes and corrupt pixels',async()=>{
  const png=await pixel();
  const cases=[
    'https://example.test/image.png','http://127.0.0.1/private','file:///private.png',
    'templates-image:v1:'+'a'.repeat(64)+'.png',
    data(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),'svg+xml'),
    data(png,'jpeg'),data(Buffer.alloc(2097153)),data(png.subarray(0,40))
  ];
  for(const source of cases)await assert.rejects(preparePublication(project(source)),/Bild|bild/);
  const header=Buffer.from(png);header.writeUInt32BE(7000,16);header.writeUInt32BE(6000,20);
  header.writeUInt32BE(crc32(header.subarray(12,29)),29);
  await assert.rejects(preparePublication(project(data(header))),/40 megapixel/);
  // Valid signature and metadata do not excuse truncated actual JPEG pixel data.
  const jpg=await sharp(png).jpeg().toBuffer();
  await assert.rejects(preparePublication(project(data(jpg.subarray(0,jpg.length-30),'jpeg'))),/Bild|bild/);
});
test('Animated GIF is rejected instead of silently losing frames',async()=>{
  const gif=await sharp({create:{width:1,height:1,channels:3,background:'red'}}).gif().toBuffer();
  // Duplicate its image descriptor/data before the trailer to create two real frames.
  const descriptor=gif.indexOf(Buffer.from([0x2c]));
  const two=Buffer.concat([gif.subarray(0,-1),gif.subarray(descriptor,-1),Buffer.from([0x3b])]);
  assert.equal((await sharp(two).metadata()).pages,2);
  await assert.rejects(preparePublication(project(data(two,'gif'))),/Animerade/);
  const png=await pixel(),chunk=Buffer.alloc(20);
  chunk.writeUInt32BE(8,0);chunk.write('acTL',4);chunk.writeUInt32BE(2,8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4,16)),16);
  const apng=Buffer.concat([png.subarray(0,33),chunk,png.subarray(33)]);
  await assert.rejects(preparePublication(project(data(apng))),/Animerade/);
});
test('Processing deadline stops the child, releases capacity and simultaneous jobs fail closed',async()=>{
  const input=project(data(await pixel()));
  await assert.rejects(preparePublication(input,{timeoutMs:1}),/för lång tid/);
  const first=preparePublication(input);
  await assert.rejects(preparePublication(input),/upptagen/);
  assert.equal((await first).imageReport.length,1);
  await assert.rejects(preparePublication(input,{timeoutMs:30001}),/Tidsgränsen/);
});
test('Publication CLI writes only a fresh directory after success; invalid images create no output',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'templates-image-cli-'));
  const source=path.join(dir,'test.projekt.json'),out=path.join(dir,'site'),tool=path.join(__dirname,'../tools/prepare-publication.cjs');
  fs.writeFileSync(source,JSON.stringify(project(data(await pixel()))));
  const report=JSON.parse(execFileSync(process.execPath,[tool,source,out],{encoding:'utf8',windowsHide:true}));
  assert.equal(report.status,'LOCAL_PREPARED');assert.equal(report.published,false);assert.ok(fs.existsSync(path.join(out,'index.html')));
  assert.throws(()=>execFileSync(process.execPath,[tool,source,out],{stdio:'pipe',windowsHide:true}),/Målmappen finns redan/);
  const failed=path.join(dir,'bad');fs.writeFileSync(source,JSON.stringify(project(data(Buffer.from('broken')))));
  assert.throws(()=>execFileSync(process.execPath,[tool,source,failed],{stdio:'pipe',windowsHide:true}));
  assert.equal(fs.existsSync(failed),false);
});
