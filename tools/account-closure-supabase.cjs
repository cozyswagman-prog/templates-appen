// Explicitly injected server client; no CLI, credentials, network setup or UI route.
// Only used with synthetic local services until the complete closure flow is approved.
const {createHash}=require('node:crypto');
const {normalizeScope,binding}=require('./account-closure-jobs.cjs');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const fault=code=>Object.assign(new Error(code),{closureCode:code});
function checked(c,phase=null){
  const scope=normalizeScope(c?.ownerId,c?.scope);
  if(!UUID.test(c.id) || !Number.isSafeInteger(c.fence) || c.fence<1 || typeof c.assertLease!=='function'
    || (phase && c.phase!==phase) || createHash('sha256').update(JSON.stringify(scope)).digest('hex')!==c.scopeHash) throw fault('SCOPE_CHANGED');
  c.assertLease();return scope;
}
const params=c=>({p_owner:c.ownerId,p_job:c.id,p_hash:c.scopeHash,p_fence:c.fence});
const empty=s=>['projects','images','refs','objects'].every(k=>s.counts[k]===0);
function stateResult(c,data){
  if(!data || Object.entries(binding(c)).some(([k,v])=>data[k]!==v)
    || data.privateWritesBlocked!==true || typeof data.authPresent!=='boolean'
    || !Array.isArray(data.objects) || new Set(data.objects).size!==data.objects.length
    || data.objects.some(key=>!c.scope.storageObjects.includes(key))
    || ['projects','images','refs','objects'].some(k=>!Number.isSafeInteger(data.counts?.[k]) || data.counts[k]<0)
    || data.counts.objects!==data.objects.length) throw fault('UNVERIFIED_RESULT');
  return data;
}
function createSupabaseClosure({client,mode,batchSize=100}){
  if(mode!=='local-rehearsal' || !client?.rpc || !client?.storage?.from || !client?.auth?.admin?.deleteUser
    || !Number.isInteger(batchSize) || batchSize<1 || batchSize>1000) throw fault('LOCAL_ADAPTER_REQUIRED');
  const rpc=async(name,c,extra={})=>{
    checked(c);let result;
    try{result=await client.rpc(name,{...params(c),...extra});}catch{throw fault('STEP_FAILED');}
    c.assertLease();
    if(result?.error){
      const code=result.error.code;
      throw fault(code==='PT422'?'SCOPE_CHANGED':code==='PT423'?'GUARD_REQUIRED':code==='PT409'?'STALE_CLAIM':'STEP_FAILED');
    }
    return stateResult(c,result?.data);
  };
  const state=c=>rpc('closure_execution_state',c);
  return {
    state,
    async freeze(c){
      const scope=checked(c);
      const s=await rpc('claim_closure_execution',c,{p_projects:scope.projectIds,p_objects:scope.storageObjects});
      return {...binding(c),privateWritesBlocked:s.privateWritesBlocked,verified:true};
    },
    async storage(c){
      checked(c,'storage');let s=await state(c);
      while(s.objects.length){
        const batch=s.objects.slice(0,batchSize),before=s.objects.length;
        c.assertLease();let result;
        try{result=await client.storage.from('project-images').remove(batch);}catch{throw fault('STEP_FAILED');}
        c.assertLease();if(result?.error || !result)throw fault('STEP_FAILED');
        s=await state(c);
        if(s.objects.length>=before || batch.some(key=>s.objects.includes(key)))throw fault('UNVERIFIED_RESULT');
      }
      return {...binding(c),verified:true};
    },
    async projects(c){
      checked(c,'projects');const before=await state(c);
      if(before.counts.objects)throw fault('GUARD_REQUIRED');
      const after=await rpc('erase_closed_projects',c);
      if(!empty(after))throw fault('UNVERIFIED_RESULT');
      return {...binding(c),verified:true};
    },
    async auth(c){
      checked(c,'auth');const before=await state(c);
      if(!empty(before))throw fault('GUARD_REQUIRED');
      if(before.authPresent){
        c.assertLease();let result;
        try{result=await client.auth.admin.deleteUser(c.ownerId,false);}catch{throw fault('STEP_FAILED');}
        c.assertLease();if(result?.error || !result)throw fault('STEP_FAILED');
      }
      const after=await state(c);
      if(after.authPresent || !empty(after))throw fault('UNVERIFIED_RESULT');
      return {...binding(c),verified:true};
    },
    async verify(c){
      checked(c,'verify');const after=await state(c);
      if(after.authPresent || !empty(after))throw fault('UNVERIFIED_RESULT');
      return {...binding(c),verified:true};
    }
  };
}
module.exports={createSupabaseClosure};
