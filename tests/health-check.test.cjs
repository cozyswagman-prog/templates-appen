const {test}=require('node:test');
const assert=require('node:assert/strict');
test('Health probes accept expected responses, use no credentials and only read-only methods',async()=>{
  const {checkHealth,TARGETS}=await import('../tools/health-check.mjs');
  const result=await checkHealth({request:async(url,options)=>{
    const t=TARGETS.find(t=>t.url===url&&(t.method||'GET')===options.method&&t.origin===options.headers.Origin);
    assert.ok(['GET','OPTIONS'].includes(options.method)); assert.equal(options.redirect,'manual'); assert.equal(options.headers.Authorization,undefined);
    return new Response(t.status===204?null:(t.contains||''),{status:t.status,headers:t.header?{[t.header[0]]:t.header[1]}:{}});
  }});
  assert.equal(result.status,'PASS'); assert.equal(result.checks.length,5);
});
test('Health probes fail closed for wrong HTTP, content and security headers',async()=>{
  const {checkHealth}=await import('../tools/health-check.mjs');
  for(const target of [{status:200},{status:200,contains:'Templates'},{status:200,header:['x-content-type-options','nosniff']}]){
    const result=await checkHealth({targets:[{name:'probe',url:'https://example.test',...target}],request:async()=>new Response('wrong',{status:target.contains||target.header?200:503})});
    assert.equal(result.status,'FAIL');
  }
});
test('Health probes suppress provider error details and still report other targets',async()=>{
  const {checkHealth}=await import('../tools/health-check.mjs');
  const result=await checkHealth({targets:[{name:'bad',url:'https://bad.test',status:200},{name:'good',url:'https://good.test',status:200}],request:async url=>{if(url.includes('bad'))throw Error('private-token-never-log');return new Response('ok');}});
  assert.equal(result.status,'FAIL'); assert.equal(result.checks[1].status,'PASS'); assert.ok(!JSON.stringify(result).includes('private-token-never-log'));
});
