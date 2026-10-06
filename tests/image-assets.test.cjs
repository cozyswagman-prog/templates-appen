const { test } = require('node:test'), assert = require('node:assert/strict');
const Images = require('../js/image-assets.js');
const { createProjectStore } = require('../js/project-store.js');
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8z8AAAAASUVORK5CYII=';
const draft = () => ({ name: 'Bilder ÅÄÖ', templateId: 'cafe', values: { 'index.html': { 1: png }, 'meny.html': { 2: 'Oförändrad text' } }, site: { pages: { 'meny.html': { images: { hero: { src: png, alt: 'Min bild', focus: 'top' } } } } } });
function provider(reportMissing = false) {
  const files = new Map(), calls = [];
  const client = {
    async rpc(name, args) {
      calls.push({ name, args });
      const actual = args.p_name.replace('.', '-' + 'a'.repeat(32) + '.');
      return { data: { name: actual, uploaded: !reportMissing && files.has(args.p_owner + '/' + actual) } };
    },
    storage: { from(bucket) {
      assert.equal(bucket, Images.BUCKET);
      return {
        async upload(path, bytes, options) {
          calls.push({ upload: path, options });
          if (files.has(path)) return { error: { statusCode: '409' } };
          files.set(path, new Blob([bytes], { type: options.contentType })); return { data: {} };
        },
        async download(path) { calls.push({ download: path }); return files.has(path) ? { data: files.get(path) } : { error: {} }; }
      };
    } }
  };
  return { client, files, calls };
}
const guard = () => {};
test('Image format signatures, size and malformed base64 are checked', () => {
  assert.equal(Images.parse(png).mime, 'image/png');
  for (const invalid of [png.replace('png', 'jpeg'), 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,%%%%', png.slice(0,-1), 'data:text/html;base64,PHNjcmlwdD4=']) assert.throws(() => Images.parse(invalid));
  assert.throws(() => Images.parse(png, 10), /stor/);
  assert.throws(() => Images.parse('data:image/png;base64,' + 'A'.repeat(2800000)), /stor/);
});
test('Private round trip deduplicates numbered and named images, preserves alt/focus and input', async () => {
  const { client, files, calls } = provider(), assets = Images.create(client), original = draft();
  const packed = await assets.pack(original, 'owner-a', guard);
  assert.ok(packed.values['index.html'][1].startsWith(Images.PREFIX));
  assert.equal(packed.values['index.html'][1], packed.site.pages['meny.html'].images.hero.src);
  assert.equal(files.size, 1); assert.equal(original.values['index.html'][1], png);
  assert.equal(calls.find(x => x.upload).options.upsert, false);
  const reloaded = await Images.create(client).unpack(packed, 'owner-a', guard);
  assert.deepEqual(reloaded, original);
  assert.equal(calls.filter(x => x.download).length, 1);
  await assets.pack(original, 'owner-a', guard);
  assert.equal(calls.filter(x => x.upload).length, 1);
  assert.deepEqual(await assets.unpack(original, 'owner-a', guard), original);
  const textOnly = { values: { 'index.html': { 1: 'data: en vanlig text' } } };
  assert.deepEqual(await assets.pack(textOnly, 'owner-a', guard), textOnly);
  const flat = { values: { 1: png } };
  assert.deepEqual(await assets.unpack(await assets.pack(flat, 'owner-a', guard), 'owner-a', guard), flat);
});
test('Retry after interruption verifies an existing immutable object, and quota messages preserve drafts', async () => {
  const { client, calls } = provider(true);
  await Images.create(client).pack(draft(), 'a', guard);
  await Images.create(client).pack(draft(), 'a', guard);
  assert.equal(calls.filter(x => x.download).length, 1);
  client.rpc = async () => ({ error: { code: 'PT413' } });
  const input = draft(); await assert.rejects(Images.create(client).pack(input, 'b', guard), /100 bildplatser/);
  assert.equal(input.values['index.html'][1], png);
});
test('Invalid later image is rejected before any upload or reservation', async () => {
  const { client, calls } = provider(), input = draft();
  input.site.pages['meny.html'].images.hero.src = 'data:image/svg+xml;base64,PHN2Zz4=';
  await assert.rejects(Images.create(client).pack(input, 'a', guard));
  assert.deepEqual(calls, []);
});
test('Missing, altered and cross-owner bytes never open a partial project', async () => {
  const { client, files } = provider(), assets = Images.create(client);
  const packed = await assets.pack(draft(), 'a', guard);
  await assert.rejects(assets.unpack(packed, 'b', guard), /Bilden kunde/);
  const key = [...files.keys()][0], original = Buffer.from(Images.parse(png).bytes); original[30] ^= 1;
  files.set(key, new Blob([original]));
  await assert.rejects(assets.unpack(packed, 'a', guard), /Bilden kunde/);
  packed.values['index.html'][1] = Images.PREFIX + '../other/image.png';
  await assert.rejects(assets.unpack(packed, 'a', guard), /ogiltig bildreferens/);
});
test('Session change after reservation prevents upload and project commit', async () => {
  const { client, calls } = provider(); let store;
  client.rpc = async (name, args) => { calls.push({ name, args }); store.setUser({ id: 'b' }); return {}; };
  store = createProjectStore({}, client); store.setUser({ id: 'a' });
  await assert.rejects(store.save({ ...draft(), id: 'p' }), /Kontot/);
  assert.equal(calls.length, 1); assert.equal(calls[0].name, 'reserve_project_image');
});
test('Upload failure leaves project uncommitted and caller data portable', async () => {
  const { client, calls } = provider();
  client.storage.from = () => ({ upload: async () => ({ error: {} }), download: async () => ({ error: {} }) });
  const store = createProjectStore({}, client); store.setUser({ id: 'a' });
  const input = { ...draft(), id: 'p' };
  await assert.rejects(store.save(input), /Bilden kunde/);
  assert.equal(input.values['index.html'][1], png); assert.ok(!calls.some(x => x.name === 'save_project'));
});
test('Successful commit returns portable content without downloading after the new revision', async () => {
  const { client, calls } = provider();
  const reserve = client.rpc;
  client.rpc = async (name, args) => name === 'save_project'
    ? { data: [{ id: args.p_id, content: args.p_content, revision: 1, updated_at: '2026-10-04' }] }
    : reserve(name, args);
  const store = createProjectStore({}, client); store.setUser({ id: 'a' });
  const result = await store.save({ ...draft(), id: 'p' });
  assert.equal(result.cloudRevision, 1); assert.equal(result.values['index.html'][1], png);
  assert.ok(!calls.some(x => x.download));
});

test('Old hash-only image references remain readable and wrong server generations fail closed', async () => {
  const {client,files,calls}=provider(), assets=Images.create(client), parsed=Images.parse(png);
  const oldName=await Images.filename(parsed);
  files.set('a/'+oldName,new Blob([parsed.bytes]));
  const original={values:{'index.html':{1:Images.PREFIX+oldName}}};
  assert.equal((await assets.unpack(original,'a',guard)).values['index.html'][1],png);
  client.rpc=async()=>({data:{name:'0'.repeat(64)+'-'+ 'a'.repeat(32)+'.png',uploaded:true}});
  await assert.rejects(assets.pack(draft(),'a',guard),/Bilden kunde/);
  assert.ok(!calls.some(call=>call.upload));
});
