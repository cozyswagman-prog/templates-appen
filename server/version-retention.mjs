// Keep the active version plus five other published versions. Never infer that an
// unregistered upload is abandoned: it may still be writing its files.
const ID = /^[a-z0-9][a-z0-9-]{2,62}$/;
const VERSION = /^[0-9a-f-]{36}$/;
export const RETAIN_PREVIOUS = 5, CLEANUP_VERSIONS = 2, CLEANUP_FILES = 20;
export function versionPrefix(siteId, versionId) {
  if (!ID.test(siteId) || !VERSION.test(versionId)) throw new Error('Invalid version cleanup scope');
  return 'sites/' + siteId + '/v/' + versionId + '/';
}

// This predicate is used both for the read-only plan and, critically, inside the
// atomic claim. A plan alone is never permission to delete a version.
const eligible = `p.version_id <> s.active_version
  and not exists (select 1 from version_retirements r where r.site_id=p.site_id and r.version_id=p.version_id)
  and p.version_id not in (select newer.version_id from published_versions newer
    where newer.site_id=p.site_id and newer.version_id <> s.active_version
    and not exists (select 1 from version_retirements r where r.site_id=newer.site_id and r.version_id=newer.version_id)
    order by newer.published_revision desc, newer.version_id desc limit ${RETAIN_PREVIOUS})`;
export const RETENTION_PLAN_SQL = `select p.site_id siteId, p.version_id versionId from published_versions p
  join sites s on s.id=p.site_id where ${eligible}
  order by p.published_revision, p.site_id, p.version_id limit ?`;

export function d1Retention(db) {
  return {
    async plan(limit) {
      return (await db.prepare(RETENTION_PLAN_SQL).bind(limit).all()).results;
    },
    async claim(siteId, versionId) {
      versionPrefix(siteId, versionId);
      const result = await db.prepare(`insert or ignore into version_retirements (site_id, version_id, completed)
        select p.site_id, p.version_id, 0 from published_versions p join sites s on s.id=p.site_id
        where p.site_id=? and p.version_id=? and ${eligible}`).bind(siteId, versionId).run();
      return result.meta.changes === 1;
    },
    async pending(limit) {
      return (await db.prepare('select site_id siteId, version_id versionId from version_retirements where completed=0 order by site_id, version_id limit ?').bind(limit).all()).results;
    },
    async finish(siteId, versionId) {
      // Keep the small tombstone permanently: a stale rollback must never revive
      // a version after its files or public registry entry have been removed.
      await db.batch([
        db.prepare('delete from published_versions where site_id=? and version_id=? and exists (select 1 from version_retirements where site_id=? and version_id=?)').bind(siteId, versionId, siteId, versionId),
        db.prepare('update version_retirements set completed=1 where site_id=? and version_id=?').bind(siteId, versionId)
      ]);
    }
  };
}

export async function cleanupVersions({ store, bucket, dryRun = true }) {
  const pending = await store.pending(CLEANUP_VERSIONS);
  const candidates = await store.plan(CLEANUP_VERSIONS - pending.length);
  if (dryRun) return { dryRun: true, keepPrevious: RETAIN_PREVIOUS, pending, candidates };
  const jobs = [...pending];
  for (const row of candidates) if (await store.claim(row.siteId, row.versionId)) jobs.push(row);
  const results = [];
  for (const row of jobs) {
    const prefix = versionPrefix(row.siteId, row.versionId);
    // Always resume at the start of this exact prefix. Deleted keys disappear;
    // short R2 pages and an interrupted delete are safe to retry next time.
    const keys = await bucket.listKeys(prefix, CLEANUP_FILES);
    if (keys.length > CLEANUP_FILES || keys.some(key => !key.startsWith(prefix))) throw new Error('Unsafe cleanup listing');
    if (keys.length) await bucket.deleteKeys(keys);
    const complete = (await bucket.listKeys(prefix, 1)).length === 0;
    if (complete) await store.finish(row.siteId, row.versionId);
    results.push({ ...row, deletedFiles: keys.length, complete });
  }
  return { dryRun: false, keepPrevious: RETAIN_PREVIOUS, results };
}
