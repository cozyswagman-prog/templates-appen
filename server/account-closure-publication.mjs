// D1-only publication boundary. No Auth/Storage/Stripe calls and no operator HTTP route.
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const SITE=/^[a-z0-9][a-z0-9-]{2,62}$/;
const error=(code,message)=>Object.assign(new Error(message),{code});
const closed=()=>error('account-closed','Kontot är spärrat för publicering.');
const receipt=c=>({jobId:c.id,ownerId:c.ownerId,scopeHash:c.scopeHash,fence:c.fence});
function context(c) {
  if(!c || !UUID.test(c.id) || !UUID.test(c.ownerId) || !/^[a-f0-9]{64}$/.test(c.scopeHash)
    || !Number.isSafeInteger(c.fence) || c.fence<1 || !Array.isArray(c.scope?.siteIds)
    || c.scope.siteIds.length>10000 || c.scope.siteIds.some(id=>!SITE.test(id))
    || new Set(c.scope.siteIds).size!==c.scope.siteIds.length) throw error('closure-scope','Ogiltig jobbomfattning.');
  return JSON.stringify([...c.scope.siteIds].sort());
}
const current=`owner_id=? and job_id=? and scope_hash=? and fence=? and site_ids=?`;
const args=c=>[c.ownerId,c.id,c.scopeHash,c.fence,context(c)];
function translate(e) {
  if(String(e?.message).includes('ACCOUNT_CLOSED')) throw closed();
  if(/CLOSURE_/.test(String(e?.message))) throw error('closure-conflict','Jobbets spärr eller omfattning har ändrats.');
  throw e;
}
export function createPublicationClosure({db,backend}) {
  if(backend!=='d1') throw error('closure-config','Kontospärren kräver fillagring i D1.');
  const isSiteClosed=async id=>!SITE.test(id || '') || !!await db.prepare('select 1 from closed_publication_sites where site_id=?').bind(id).first();
  const assertOpen=async ownerId=>{
    if(await db.prepare('select 1 from publication_closures where owner_id=?').bind(ownerId).first()) throw closed();
  };
  const remaining=`select
    (select count(*) from sites where owner_id=?) as sites,
    (select count(*) from site_files f join closed_publication_sites s on substr(f.key,1,length(s.site_id)+7)='sites/'||s.site_id||'/' where s.owner_id=?) as files,
    (select count(*) from published_versions v join closed_publication_sites s on s.site_id=v.site_id where s.owner_id=?) as versions,
    (select count(*) from version_retirements v join closed_publication_sites s on s.site_id=v.site_id where s.owner_id=?) as retirements`;
  return {
    assertOpen,isSiteClosed,
    async freeze(c) {
      context(c);
      try {
        // Trigger checks the complete current inventory and reserves every approved
        // site id in this same write, before any later site/file write can commit.
        await db.prepare(`insert into publication_closures(owner_id,job_id,scope_hash,fence,site_ids) values(?,?,?,?,?)
          on conflict(owner_id) do update set fence=excluded.fence`).bind(...args(c)).run();
      } catch(e){translate(e);}
      return this.proof(c);
    },
    async proof(c) {
      const row=await db.prepare('select 1 from publication_closures where '+current).bind(...args(c)).first();
      if(!row) throw error('closure-conflict','Jobbets spärr eller körning är inte aktuell.');
      return {...receipt(c),publicationWritesBlocked:true,backend:'d1'};
    },
    async erase(c) {
      const a=args(c), gate='exists(select 1 from publication_closures where '+current+')';
      // Every destructive statement tests the exact owner/job/hash/fence within
      // its own write. A stale runner deletes nothing, even after a JS precheck.
      const result=await db.batch([
        db.prepare('select 1 from publication_closures where '+current).bind(...a),
        db.prepare(`delete from site_files where exists(select 1 from closed_publication_sites s where s.owner_id=? and substr(site_files.key,1,length(s.site_id)+7)='sites/'||s.site_id||'/') and ${gate}`).bind(c.ownerId,...a),
        db.prepare(`delete from published_versions where site_id in(select site_id from closed_publication_sites where owner_id=?) and ${gate}`).bind(c.ownerId,...a),
        db.prepare(`delete from version_retirements where site_id in(select site_id from closed_publication_sites where owner_id=?) and ${gate}`).bind(c.ownerId,...a),
        db.prepare(`delete from sites where owner_id=? and id in(select site_id from closed_publication_sites where owner_id=?) and ${gate}`).bind(c.ownerId,c.ownerId,...a),
        db.prepare(remaining).bind(c.ownerId,c.ownerId,c.ownerId,c.ownerId)
      ]);
      if(!result[0].results?.length) throw error('closure-conflict','En nyare körning äger jobbet.');
      const counts=result.at(-1).results[0];
      if(!counts || Object.values(counts).some(n=>n!==0)) throw error('closure-incomplete','Publiceringsdata finns fortfarande kvar.');
      return {...receipt(c),verified:true,remaining:counts};
    },
    protect({sites,bucket}) {
      const visible=async s=>s && !await isSiteClosed(s.siteId) ? s : null;
      const write=async fn=>{try{return await fn();}catch(e){translate(e);}};
      const keySite=key=>/^sites\/([a-z0-9][a-z0-9-]{2,62})\//.exec(key)?.[1];
      return {
        sites:{...sites,
          get:async id=>visible(await sites.get(id)),
          byHost:async host=>visible(await sites.byHost(host)),
          listByOwner:async id=>{await assertOpen(id);return sites.listByOwner(id);},
          wasPublished:async(id,v)=>!await isSiteClosed(id) && sites.wasPublished(id,v),
          create:(...a)=>write(()=>sites.create(...a)),swap:(...a)=>write(()=>sites.swap(...a))},
        bucket:{...bucket,
          put:(...a)=>write(()=>bucket.put(...a)),
          get:async key=>{const object=await bucket.get(key);return await isSiteClosed(keySite(key))?null:object;},
          head:async key=>{const object=await bucket.head(key);return await isSiteClosed(keySite(key))?null:object;}}
      };
    }
  };
}
