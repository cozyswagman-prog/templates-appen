// Pure backup/restore planning. No network, database writes or credential access.
const V1 = 'templates-backup-v1', V2 = 'templates-backup-v2';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function normalizeClosures(rows) {
  if (!Array.isArray(rows)) throw new Error('Stängningsregistret saknas.');
  const seen = new Set();
  return rows.map(r => {
    if (!r || !UUID.test(r.owner_id) || typeof r.started_at !== 'string' ||
        !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(r.started_at) || !Number.isFinite(Date.parse(r.started_at)) || seen.has(r.owner_id)) {
      throw new Error('Stängningsregistret är ogiltigt eller innehåller dubbla konton.');
    }
    seen.add(r.owner_id);
    return { owner_id: r.owner_id, started_at: r.started_at };
  }).sort((a, b) => a.owner_id.localeCompare(b.owner_id));
}
function closurePlan(backup, newer = null) {
  const { manifest, db } = backup;
  const captured = manifest.format === V2;
  const original = captured ? normalizeClosures(db.account_closures) : [];
  if (newer && (newer.manifest.format !== V2 || !manifest.source || newer.manifest.source !== manifest.source ||
      !Number.isFinite(Date.parse(newer.manifest.created)) || Date.parse(newer.manifest.created) < Date.parse(manifest.created))) {
    throw new Error('Nyare stängningsbackup måste vara v2 från samma källa och får inte vara äldre.');
  }
  const merged = new Map(original.map(r => [r.owner_id, r]));
  if (newer) for (const row of normalizeClosures(newer.db.account_closures)) {
    const old = merged.get(row.owner_id);
    // A newer file can add guards but can never reopen an already closed account.
    if (!old || Date.parse(row.started_at) < Date.parse(old.started_at)) merged.set(row.owner_id, row);
  }
  const closures = [...merged.values()].sort((a, b) => a.owner_id.localeCompare(b.owner_id));
  const denied = new Set(closures.map(r => r.owner_id));
  const kept = {
    users: db.users.filter(r => !denied.has(r.id)),
    projects: db.projects.filter(r => !denied.has(r.owner_id)),
    project_images: db.project_images.filter(r => !denied.has(r.owner_id)),
    project_image_refs: db.project_image_refs.filter(r => !denied.has(r.owner_id))
  };
  return { closures, denied, db: kept,
    status: captured || newer ? 'CAPTURED_AS_OF_BACKUP' : 'UNKNOWN_LEGACY_WITHOUT_CLOSURES',
    asOf: newer ? newer.manifest.created : captured ? manifest.created : null,
    skipped: Object.fromEntries(Object.keys(kept).map(t => [t, db[t].length - kept[t].length])) };
}
module.exports = { V1, V2, normalizeClosures, closurePlan };
