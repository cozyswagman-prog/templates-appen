// Fixed child-process entry point. Only buffers are passed to Sharp, never user paths/URLs.
const sharp = require('sharp');
const Images = require('../js/image-assets.js');
sharp.cache(false);
sharp.concurrency(1);
function animatedPng(bytes) {
  for (let offset=8;offset+12<=bytes.length;) {
    const length=bytes.readUInt32BE(offset);
    if (bytes.toString('ascii',offset+4,offset+8)==='acTL') return true;
    offset+=12+length;
  }
  return false;
}
async function processImages(images) {
  if (!Array.isArray(images) || images.length>100) throw new Error('IMAGE_COUNT');
  const results=[]; let pixels=0, totalBytes=0;
  for (const data of images) {
    let parsed;
    try { parsed=Images.parse(data); } catch { throw new Error('IMAGE_FORMAT'); }
    const bytes=Buffer.from(parsed.bytes);
    if(parsed.ext==='png' && animatedPng(bytes))throw new Error('IMAGE_ANIMATION');
    const decoder=sharp(bytes,{failOn:'warning',limitInputPixels:40000000,sequentialRead:true});
    let meta;
    try { meta=await decoder.metadata(); } catch(error) { throw new Error(error.message.includes('pixel limit')?'IMAGE_PIXEL_LIMIT':'IMAGE_DECODE'); }
    if (meta.format!==parsed.ext || !meta.width || !meta.height) throw new Error('IMAGE_FORMAT');
    if ((meta.pages||1)>1) throw new Error('IMAGE_ANIMATION');
    pixels+=meta.width*meta.height;
    if (pixels>80000000) throw new Error('IMAGE_PIXELS');
    let output;
    try {
      output=await decoder.autoOrient().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true})
        .webp({quality:85,effort:4}).toBuffer({resolveWithObject:true});
    } catch { throw new Error('IMAGE_DECODE'); }
    totalBytes+=output.data.length;
    if (output.data.length>2097152 || totalBytes>12582912) throw new Error('IMAGE_OUTPUT_SIZE');
    results.push({data:'data:image/webp;base64,'+output.data.toString('base64'),width:output.info.width,height:output.info.height,bytes:output.data.length});
  }
  return results;
}
process.once('message', async message=>{
  let reply;
  try {reply={ok:true,images:await processImages(message?.images)};}
  catch(error){reply={ok:false,code:/^IMAGE_/.test(error.message)?error.message:'IMAGE_DECODE'};}
  process.send(reply,()=>process.disconnect());
});
