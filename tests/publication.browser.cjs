// Real prepared output in Chromium. No network image downloads or publishing.
const {chromium}=require('playwright'),sharp=require('sharp');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {preparePublication}=require('../tools/prepare-publication.cjs');
const {writeNewDirectory}=require('../tools/render-project.cjs');
const output=fs.mkdtempSync(path.join(os.tmpdir(),'templates-publication-browser-'));
const checks=[],errors=[];
function check(name,value){checks.push({name,status:value?'PASS':'FAIL'});assert.ok(value,name);}
(async()=>{
  const photo=await sharp({create:{width:1800,height:900,channels:3,background:'#ad723d'}})
    .jpeg().withMetadata({orientation:6}).toBuffer();
  const src='data:image/jpeg;base64,'+photo.toString('base64');
  const project={name:'Lokalt bildprov – Café',templateId:'cafe',values:{'index.html':{2:src,3:'Café – lokalt bildprov'}},
    site:{pages:{'kontakt.html':{images:{'original-0':{src,alt:'Syntetisk testbild',focus:'top'}}}}}};
  const prepared=await preparePublication(project),site=path.join(output,'site');writeNewDirectory(prepared.files,site);
  check('Prepared image metadata records correct orientation and resize',prepared.imageReport.length===1&&prepared.imageReport[0].width===800&&prepared.imageReport[0].height===1600);
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    for(const width of [390,412,768,1440]){
      await page.setViewportSize({width,height:900});
      await page.goto(pathToFileURL(path.join(site,'index.html')).href);
      check('Prepared page identity '+width,await page.title()===project.name);
      check('Prepared page fits '+width,await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
      check('All prepared and built-in images decode '+width,await page.locator('img').evaluateAll(async images=>{
        const loaded=await Promise.all(images.map(async image=>{image.loading='eager';try{await image.decode();return image.naturalWidth>0;}catch{return false;}}));return loaded.every(Boolean);
      }));
      check('Processed WebP pixels have expected dimensions '+width,await page.locator('img[src$=".webp"]').first().evaluate(e=>e.naturalWidth===800&&e.naturalHeight===1600));
      if(width===390||width===1440)await page.screenshot({path:path.join(output,'prepared-'+width+'.png')});
    }
    await page.locator('a[href="meny.html"]').first().click();
    check('Prepared multipage menu navigation works',page.url().endsWith('/meny.html'));
    await page.goto(pathToFileURL(path.join(site,'kontakt.html')).href);
    const image=page.getByAltText('Syntetisk testbild');await image.evaluate(e=>e.decode());
    check('Named image retains alt text and focus after processing',await image.evaluate(e=>e.naturalWidth===800&&getComputedStyle(e).objectPosition==='50% 0%'));
    check('Prepared site has no browser runtime or console errors',errors.length===0);
  }finally{
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checks,errors,imageReport:prepared.imageReport},null,2));
    console.log(JSON.stringify({evidence:output,pass:checks.filter(c=>c.status==='PASS').length,fail:checks.filter(c=>c.status==='FAIL')}));
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
