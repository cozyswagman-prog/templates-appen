// Local publication preparation, not an HTTP endpoint or a deployed upload service.
const fs=require('node:fs'),path=require('node:path'),{fork}=require('node:child_process');
const {DOMParser}=require('linkedom');
const {decodeProject,createRuntime,renderProject,writeNewDirectory}=require('./render-project.cjs');
const Images=require('../js/image-assets.js');
const messages={
  IMAGE_FORMAT:'Bilden har ett ogiltigt format. Använd inbäddad PNG, JPEG, WebP eller GIF.',
  IMAGE_DECODE:'Bilden är skadad, för stor i pixlar eller kan inte avkodas. Välj en annan bild.',
  IMAGE_ANIMATION:'Animerade bilder stöds inte i publiceringssteget ännu. Välj en stillbild.',
  IMAGE_PIXELS:'Projektets bilder innehåller för många pixlar (högst 80 megapixel sammanlagt).',
  IMAGE_PIXEL_LIMIT:'Bilden överskrider gränsen på 40 megapixel. Välj en mindre bild.',
  IMAGE_COUNT:'Projektet innehåller fler än 100 olika bilder.',
  IMAGE_OUTPUT_SIZE:'De bearbetade bilderna är för stora: högst 2 MB per bild och 12 MB sammanlagt.'
};
let processing=false;
function runDecoder(images,timeoutMs) {
  return new Promise((resolve,reject)=>{
    const env={};
    for(const key of ['SystemRoot','TEMP','TMP'])if(process.env[key])env[key]=process.env[key];
    const child=fork(path.join(__dirname,'image-processing-worker.cjs'),[],{
      execArgv:['--max-old-space-size=128'],env,windowsHide:true,stdio:['ignore','ignore','ignore','ipc']
    });
    let response,error;
    const timer=setTimeout(()=>{error=new Error('Bildbearbetningen tog för lång tid. Minska bilderna och försök igen.');child.kill('SIGKILL');},timeoutMs);
    child.once('error',()=>{error=new Error('Bildbearbetningen kunde inte startas.');});
    child.once('message',message=>{response=message;});
    child.once('close',code=>{
      clearTimeout(timer);
      if(error)return reject(error);
      if(code!==0 || !response)return reject(new Error('Bildbearbetningen avbröts. Inga publiceringsfiler har skapats.'));
      if(response.ok!==true)return reject(new Error(messages[response.code]||messages.IMAGE_DECODE));
      if(!Array.isArray(response.images)||response.images.length!==images.length)return reject(new Error('Ogiltigt svar från bildbearbetningen.'));
      resolve(response.images);
    });
    child.send({images},error=>{if(error){child.kill('SIGKILL');}});
  });
}
function imageFields(project,runtime) {
  const result=[],pages=runtime.SiteRenderer.pagesOf(runtime.TEMPLATES.find(t=>t.id===project.templateId));
  for(const page of pages) {
    const doc=new DOMParser().parseFromString(page.html,'text/html');
    doc.querySelectorAll('[data-slot]').forEach((el,index)=>{
      const values=project.values[page.file],key=String(index+1);
      if(el.getAttribute('data-slot')==='image' && values && Object.hasOwn(values,key))result.push([values,key]);
    });
  }
  for(const page of Object.values(project.site?.pages||{})) {
    for(const image of Object.values(page?.images||{})) {
      if(image && typeof image==='object' && Object.hasOwn(image,'src'))result.push([image,'src']);
    }
  }
  return result;
}
async function preparePublication(input,{timeoutMs=30000}={}) {
  if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw new Error('Tidsgränsen måste vara mellan 1 och 30000 ms.');
  if(processing)throw new Error('Bildbearbetningen är upptagen. Försök igen när den pågående körningen är klar.');
  processing=true;
  try {
    const runtime=createRuntime(),project=runtime.SiteRenderer.normalize(decodeProject(input));
    const fields=imageFields(project,runtime),unique=new Map();
    for(const [object,key] of fields) {
      const data=object[key];
      try {Images.parse(data);}catch{throw new Error(messages.IMAGE_FORMAT+' Hämta kontobilderna till en projektfil först.');}
      if(!unique.has(data))unique.set(data,unique.size);
    }
    if(unique.size>100)throw new Error(messages.IMAGE_COUNT);
    // Verify the complete project against existing renderer rules before native decoding.
    renderProject(project);
    const outputs=unique.size?await runDecoder([...unique.keys()],timeoutMs):[];
    for(const [object,key] of fields)object[key]=outputs[unique.get(object[key])].data;
    const files=renderProject(project);
    return {files,imageReport:outputs.map(({width,height,bytes})=>({width,height,bytes,format:'webp'}))};
  } finally {processing=false;}
}
if(require.main===module) {
  (async()=>{
    const [source,destination]=process.argv.slice(2);
    if(!source||!destination||process.argv.length!==4)throw new Error('Använd: npm run prepare:publication -- projekt.projekt.json NY_UTMAPP');
    if(fs.existsSync(path.resolve(destination)))throw new Error('Målmappen finns redan; inga befintliga filer skrivs över.');
    if(fs.statSync(source).size>20971520)throw new Error('Projektfilen är större än 20 MB.');
    const {files,imageReport}=await preparePublication(fs.readFileSync(source,'utf8'));
    writeNewDirectory(files,destination);
    console.log(JSON.stringify({status:'LOCAL_PREPARED',files:files.size,images:imageReport.length,published:false}));
  })().catch(error=>{console.error(error.message);process.exitCode=1;});
}
module.exports={preparePublication};
