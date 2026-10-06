// Local rehearsal coordinator only. No CLI, network clients or production adapters.
// Adapters must independently fence side effects and verify their exact owner scope.
const { DatabaseSync } = require('node:sqlite');
const { randomUUID, createHash } = require('node:crypto');
const STEPS = Object.freeze(['freeze', 'publication', 'storage', 'projects', 'auth', 'verify']);
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const digest = value => createHash('sha256').update(value).digest('hex');
const fault = code => Object.assign(new Error(code), { closureCode: code });
function normalizeScope(ownerId, scope) {
  if (!UUID.test(ownerId) || !scope || Object.keys(scope).sort().join(',') !== 'projectIds,siteIds,storageObjects') throw fault('INVALID_SCOPE');
  const list = (key, valid) => {
    const values = scope[key];
    if (!Array.isArray(values) || values.length > 10000 || values.some(v => typeof v !== 'string' || !valid(v)) || new Set(values).size !== values.length) throw fault('INVALID_SCOPE');
    return [...values].sort();
  };
  return {
    projectIds: list('projectIds', v => /^[a-zA-Z0-9_-]{1,100}$/.test(v)),
    siteIds: list('siteIds', v => /^[a-z0-9][a-z0-9-]{2,62}$/.test(v)),
    storageObjects: list('storageObjects', v => v.startsWith(ownerId + '/') && /^[a-f0-9]{64}(?:-[a-f0-9]{32})?\.(?:png|jpeg|webp|gif)$/.test(v.slice(ownerId.length + 1)))
  };
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

class ClosureJobStore {
  constructor(filename, { mode, now = Date.now, leaseMs = 30000, retryMs = 1000, maxAttempts = 3 } = {}) {
    if (mode !== 'local-rehearsal' || ![leaseMs, retryMs, maxAttempts].every(n => Number.isSafeInteger(n) && n > 0) || maxAttempts > 100) throw fault('LOCAL_MODE_REQUIRED');
    this.now = now; this.leaseMs = leaseMs; this.retryMs = retryMs; this.maxAttempts = maxAttempts;
    this.db = new DatabaseSync(filename);
    this.db.exec(`pragma journal_mode=WAL; pragma synchronous=FULL; pragma busy_timeout=1000;
      create table if not exists closure_jobs_v1 (
        id text primary key, owner_id text not null unique, scope text not null, scope_hash text not null,
        step integer not null default 0 check(step between 0 and 6),
        status text not null default 'pending' check(status in ('pending','running','retry','blocked','complete')),
        fence integer not null default 0, attempts integer not null default 0,
        lease_until integer not null default 0, retry_at integer not null default 0,
        error_code text, created_at integer not null, updated_at integer not null
      );
      create table if not exists closure_job_events_v1 (
        sequence integer primary key, job_id text not null, step integer not null,
        fence integer not null, kind text not null, at integer not null
      );`);
  }
  close() { this.db.close(); }
  transaction(fn) {
    this.db.exec('begin immediate');
    try { const result = fn(); this.db.exec('commit'); return result; }
    catch (e) { this.db.exec('rollback'); throw e; }
  }
  read(id) {
    const r = this.db.prepare('select * from closure_jobs_v1 where id=?').get(id);
    if (!r) throw fault('JOB_NOT_FOUND');
    if (digest(r.scope) !== r.scope_hash) throw fault('SCOPE_CORRUPT');
    const scope = normalizeScope(r.owner_id, JSON.parse(r.scope));
    if (JSON.stringify(scope) !== r.scope) throw fault('SCOPE_CORRUPT');
    return freeze({ id:r.id, ownerId:r.owner_id, scope, scopeHash:r.scope_hash, step:r.step,
      phase:STEPS[r.step] || 'complete', status:r.status, fence:r.fence, attempts:r.attempts,
      leaseUntil:r.lease_until, retryAt:r.retry_at, errorCode:r.error_code });
  }
  event(job, kind) {
    this.db.prepare('insert into closure_job_events_v1(job_id,step,fence,kind,at) values(?,?,?,?,?)').run(job.id,job.step,job.fence,kind,this.now());
  }
  events(id) { return this.db.prepare('select step,fence,kind,at from closure_job_events_v1 where job_id=? order by sequence').all(id); }
  create({ ownerId, scope, reviewed }) {
    if (reviewed !== true) throw fault('SCOPE_REVIEW_REQUIRED');
    const encoded = JSON.stringify(normalizeScope(ownerId, scope)), hash = digest(encoded);
    return this.transaction(() => {
      const old = this.db.prepare('select id from closure_jobs_v1 where owner_id=?').get(ownerId);
      if (old) { const job = this.read(old.id); if (job.scopeHash !== hash) throw fault('SCOPE_CONFLICT'); return job; }
      const id = randomUUID(), now = this.now();
      this.db.prepare('insert into closure_jobs_v1(id,owner_id,scope,scope_hash,created_at,updated_at) values(?,?,?,?,?,?)').run(id,ownerId,encoded,hash,now,now);
      const job = this.read(id); this.event(job,'created'); return job;
    });
  }
  claim(id) {
    return this.transaction(() => {
      const job = this.read(id), now = this.now();
      if (['complete','blocked'].includes(job.status) || job.retryAt > now || (job.status === 'running' && job.leaseUntil > now)) return null;
      if (job.attempts >= this.maxAttempts) {
        this.db.prepare("update closure_jobs_v1 set status='blocked',error_code='ATTEMPTS_EXHAUSTED',lease_until=0,updated_at=? where id=?").run(now,id);
        this.event(job,'attempts_exhausted'); return null;
      }
      this.db.prepare("update closure_jobs_v1 set status='running',fence=fence+1,attempts=attempts+1,lease_until=?,retry_at=0,error_code=null,updated_at=? where id=?").run(now+this.leaseMs,now,id);
      const claim = this.read(id); this.event(claim,'claimed'); return claim;
    });
  }
  assertLease(claim) {
    const job = this.read(claim.id);
    if (job.status !== 'running' || job.fence !== claim.fence || job.step !== claim.step || job.scopeHash !== claim.scopeHash || job.ownerId !== claim.ownerId || job.leaseUntil <= this.now()) throw fault('STALE_CLAIM');
    return job;
  }
  renew(claim) {
    return this.transaction(() => {
      this.assertLease(claim);
      this.db.prepare('update closure_jobs_v1 set lease_until=?,updated_at=? where id=?').run(this.now()+this.leaseMs,this.now(),claim.id);
      return this.read(claim.id);
    });
  }
  advance(claim) {
    return this.transaction(() => {
      this.assertLease(claim);
      const next = claim.step + 1;
      this.db.prepare('update closure_jobs_v1 set step=?,status=?,attempts=0,lease_until=0,retry_at=0,error_code=null,updated_at=? where id=?').run(next,next===STEPS.length?'complete':'pending',this.now(),claim.id);
      this.event(claim,'verified'); return this.read(claim.id);
    });
  }
  fail(claim, code, blocked = false) {
    // Only our fixed codes are ever persisted; no raw service errors or secrets.
    if (!['STEP_FAILED','GUARD_REQUIRED','SCOPE_CHANGED','UNVERIFIED_RESULT'].includes(code)) code='STEP_FAILED';
    return this.transaction(() => {
      this.assertLease(claim);
      const stop = blocked || claim.attempts >= this.maxAttempts;
      const delay = Math.min(3600000, this.retryMs * (2 ** Math.min(claim.attempts-1,20)));
      this.db.prepare('update closure_jobs_v1 set status=?,lease_until=0,retry_at=?,error_code=?,updated_at=? where id=?').run(stop?'blocked':'retry',stop?0:this.now()+delay,code,this.now(),claim.id);
      this.event(claim,stop?'blocked':'retry'); return this.read(claim.id);
    });
  }
  resume(id, expectedFence) {
    return this.transaction(() => {
      const job = this.read(id);
      // Restored snapshots require reconciliation of all services, not ordinary retry approval.
      if (job.errorCode === 'RESTORE_REVIEW_REQUIRED') throw fault('RESTORE_REVIEW_REQUIRED');
      if (job.status !== 'blocked' || job.fence !== expectedFence) throw fault('REVIEW_STATE_CHANGED');
      this.db.prepare("update closure_jobs_v1 set status='pending',attempts=0,retry_at=0,error_code=null,updated_at=? where id=?").run(this.now(),id);
      this.event(job,'reviewed_resume'); return this.read(id);
    });
  }
}

function binding(context) {
  return { jobId:context.id, ownerId:context.ownerId, scopeHash:context.scopeHash, fence:context.fence };
}
function matches(proof, context) {
  return proof && Object.entries(binding(context)).every(([k,v]) => proof[k] === v);
}
async function runNext(store, id, adapter) {
  // Validate the complete contract before acquiring a lease or touching a service.
  if (!adapter || adapter.mode !== 'local-rehearsal' || ['preflight',...STEPS].some(k => typeof adapter[k] !== 'function')) throw fault('LOCAL_ADAPTER_REQUIRED');
  const claim = store.claim(id);
  if (!claim) return { result:'NOT_CLAIMED', job:store.read(id) };
  const context = freeze({ ...claim, idempotencyKey:digest(claim.id+':'+claim.phase),
    assertLease:() => store.assertLease(claim), renew:() => store.renew(claim) });
  const guard = async(requireFrozen) => {
    context.assertLease();
    const proof = await adapter.preflight(context);
    context.assertLease();
    if (!matches(proof,context) || proof.scopeMatches !== true) throw fault('SCOPE_CHANGED');
    if (proof.billingSettled !== true || (requireFrozen && [proof.privateWritesBlocked,proof.publicationWritesBlocked,proof.inFlightDrained].some(v => v !== true))) throw fault('GUARD_REQUIRED');
  };
  try {
    await guard(claim.phase !== 'freeze');
    const result = await adapter[claim.phase](context);
    context.assertLease();
    if (!matches(result,context) || result.verified !== true) throw fault('UNVERIFIED_RESULT');
    // A checkpoint is accepted only with a fresh guard check after the operation.
    await guard(true);
    return { result:'ADVANCED', job:store.advance(claim) };
  } catch (e) {
    const code = ['SCOPE_CHANGED','GUARD_REQUIRED','UNVERIFIED_RESULT','STALE_CLAIM'].includes(e?.closureCode) ? e.closureCode : 'STEP_FAILED';
    if (code === 'STALE_CLAIM') return { result:code, job:store.read(id) };
    try { return { result:code, job:store.fail(claim,code,['SCOPE_CHANGED','GUARD_REQUIRED'].includes(code)) }; }
    catch (lost) { if (lost?.closureCode === 'STALE_CLAIM') return { result:'STALE_CLAIM',job:store.read(id) }; throw lost; }
  }
}
module.exports = { ClosureJobStore, runNext, STEPS, binding, normalizeScope };
