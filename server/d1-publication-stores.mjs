// Filerna i D1 i stället för R2: gratis utan betalkort och starkt konsistent. D1 tillåter högst 2 MB per rad.
const D1_MAX_FILE = 1900000;
export function d1Bucket(db) {
  return {
    // Range bounds use the primary-key index; no wildcard can cross a version prefix.
    listKeys: async (prefix, limit) => (await db.prepare('select key from site_files where key >= ? and key < ? order by key limit ?').bind(prefix, prefix + '\uffff', limit).all()).results.map(r => r.key),
    deleteKeys: keys => db.prepare('delete from site_files where key in (' + keys.map(() => '?').join(',') + ')').bind(...keys).run(),
    async put(key, bytes, { contentType, sha256 }) {
      if (bytes.length > D1_MAX_FILE) throw Object.assign(new Error('En bild är för stor för publicering (högst 1,9 MB). Byt till en mindre bild.'), { code: 'image' });
      await db.prepare('insert or replace into site_files (key, bytes, size, sha256, content_type) values (?, ?, ?, ?, ?)').bind(key, bytes, bytes.length, sha256, contentType).run();
    },
    async head(key) { const r = await db.prepare('select size, sha256 from site_files where key = ?').bind(key).first(); return r ? { size: r.size, sha256: r.sha256 } : null; },
    async get(key) {
      const r = await db.prepare('select bytes, size, sha256, content_type from site_files where key = ?').bind(key).first();
      return r ? { bytes: new Uint8Array(r.bytes), size: r.size, sha256: r.sha256, contentType: r.content_type } : null;
    }
  };
}
export function d1Sites(db) {
  const row = r => r && { siteId: r.id, host: r.host, ownerId: r.owner_id, active: r.active_version, revision: r.revision };
  return {
    get: async id => row(await db.prepare('select id, host, owner_id, active_version, revision from sites where id = ?').bind(id).first()),
    byHost: async host => row(await db.prepare('select id, host, owner_id, active_version, revision from sites where host = ?').bind(host).first()),
    wasPublished: async (id, versionId) => !!await db.prepare('select 1 from published_versions p where site_id = ? and version_id = ? and not exists (select 1 from version_retirements r where r.site_id=p.site_id and r.version_id=p.version_id)').bind(id, versionId).first(),
    // D1 batch is transactional: public asset access and the pointer switch commit together.
    async swap(id, expected, versionId) {
      const result = await db.batch([
        db.prepare('update sites set active_version = ?, revision = revision + 1 where id = ? and revision = ? and not exists (select 1 from version_retirements where site_id=? and version_id=?)').bind(versionId, id, expected, id, versionId),
        db.prepare('insert or ignore into published_versions (site_id, version_id, published_revision) select id, active_version, revision from sites where id = ? and active_version = ? and revision = ?').bind(id, versionId, expected + 1)
      ]);
      return result[0].meta.changes === 1;
    },
    listByOwner: async ownerId => ((await db.prepare('select id, host, owner_id, active_version, revision from sites where owner_id = ? order by id').bind(ownerId).all()).results || []).map(row),
    async create(id, host, ownerId = null) {
      try { await db.prepare('insert into sites (id, host, owner_id, revision) values (?, ?, ?, 0)').bind(id, host, ownerId).run(); }
      catch (error) {
        const msg = String(error.message);
        if (/ACCOUNT_CLOSED/.test(msg)) throw Object.assign(new Error('Kontot är spärrat för publicering.'), { code: 'account-closed' });
        if (/sites\.owner_id|sites_one_per_owner/i.test(msg)) throw Object.assign(new Error('Kontot har redan en sajt.'), { code: 'site-exists' });
        if (/UNIQUE|constraint/i.test(msg)) throw Object.assign(new Error('Adressen är upptagen.'), { code: 'taken' });
        throw error;
      }
    }
  };
}
