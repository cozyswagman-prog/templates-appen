// Server-only reusable worker. No automatic scheduling, credentials or live connection.
// A caller must supply an approved service-role SDK client; never bundle this in the app.
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const NAME = /^[a-f0-9]{64}(?:-[a-f0-9]{32})?\.(?:png|jpeg|webp|gif)$/;
async function runImageCleanup(client, { dryRun = true, limit = 20 } = {}) {
  if (typeof dryRun !== 'boolean' || !Number.isInteger(limit) || limit < 1 || limit > 25) throw new Error('Invalid cleanup options');
  const result = await client.rpc(dryRun ? 'preview_project_image_cleanup' : 'claim_project_image_cleanup', { p_limit: limit });
  if (result.error || !Array.isArray(result.data) || result.data.length > limit) throw new Error('Cleanup selection failed');
  const seen = new Set();
  // Validate the whole response before the first irreversible Storage request.
  for (const item of result.data) {
    if (!UUID.test(item.owner_id) || !NAME.test(item.name) || (!dryRun && !UUID.test(item.delete_token))) throw new Error('Invalid cleanup claim');
    const key = item.owner_id + '/' + item.name;
    if (seen.has(key)) throw new Error('Duplicate cleanup claim');
    seen.add(key);
  }
  const report = { dryRun, selected: result.data.length, removed: 0, failed: 0, items: [] };
  for (const item of result.data) {
    const path = item.owner_id + '/' + item.name;
    if (dryRun) { report.items.push({ path, status: 'WOULD_REMOVE' }); continue; }
    try {
      const removal = await client.storage.from('project-images').remove([path]);
      if (removal.error) throw new Error('Storage removal failed');
      const finished = await client.rpc('finish_project_image_cleanup', { p_owner: item.owner_id, p_name: item.name, p_token: item.delete_token });
      if (finished.error || finished.data !== true) throw new Error('Removal not confirmed');
      report.removed++; report.items.push({ path, status: 'REMOVED' });
    } catch {
      // Retain the database claim and quota. A later run retries after 15 minutes;
      // immutable generation paths make delayed or repeated deletes harmless to new uploads.
      report.failed++; report.items.push({ path, status: 'RETRY_LATER' });
    }
  }
  return report;
}
module.exports = { runImageCleanup };
