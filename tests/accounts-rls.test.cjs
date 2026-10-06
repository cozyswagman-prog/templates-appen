// Runs the real migration in Postgres (PGlite). Auth identity is a test fixture,
// NOT proof of hosted Supabase Auth, emails, PostgREST or production settings.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const content = { name: 'Testföretag ÅÄÖ', templateId: 'cafe', values: { 'index.html': { '1': 'Privat A' }, 'meny.html': { '2': 'Meny A' } }, site: { business: { name: 'Test' } } };

test('Postgres: tenant isolation, privileges, revision conflicts and validation', async t => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon nologin; create role authenticated nologin;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
      insert into auth.users values ('${A}'), ('${B}');`);
    await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/202610030001_projects.sql'), 'utf8'));
    async function as(id, sql, args = [], role = 'authenticated') {
      await db.exec(`set role ${role};`);
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id || '']);
      try { return (await db.query(sql, args)).rows; }
      finally { await db.exec('reset role'); }
    }
    const save = (id, key, rev, value = content) => as(id, 'select * from public.save_project($1,$2,$3,$4)', [key, value, rev, id]);
    await t.test('owner saves and restores all pages and named settings', async () => {
      const rows = await save(A, 'project-a', 0);
      assert.equal(rows[0].owner_id, A); assert.equal(rows[0].revision, 1);
      assert.deepEqual(rows[0].content, content);
    });
    await t.test('another user cannot enumerate or fetch private rows', async () => {
      assert.deepEqual(await as(B, 'select * from public.projects'), []);
      assert.deepEqual(await as(B, "select * from public.projects where id='project-a'"), []);
    });
    await t.test('another user cannot update or delete a known project id through RPC', async () => {
      await assert.rejects(save(B, 'project-a', 1), { code: 'PT409' });
      await assert.rejects(as(B, "select public.delete_project('project-a',1,$1)", [B]), { code: 'PT409' });
      assert.equal((await as(A, 'select * from public.projects'))[0].revision, 1);
    });
    await t.test('equal ids in two accounts are isolated, including malicious ownership fields', async () => {
      await save(B, 'project-a', 0, { ...content, owner_id: A, name: 'Privat B' });
      const rows = await as(B, 'select * from public.projects');
      assert.equal(rows.length, 1); assert.equal(rows[0].owner_id, B);
      assert.equal((await as(A, 'select * from public.projects'))[0].content.name, content.name);
    });
    await t.test('table mutations cannot bypass RPC revision or ownership checks', async () => {
      for (const id of [A, B]) {
        await assert.rejects(as(id, "update public.projects set owner_id=$1 where id='project-a'", [B]), { code: '42501' });
        await assert.rejects(as(id, "delete from public.projects"), { code: '42501' });
        await assert.rejects(as(id, "insert into public.projects(owner_id,id,content) values($1,'direct',$2)", [id, content]), { code: '42501' });
      }
    });
    await t.test('anonymous and missing identities cannot read or save', async () => {
      await assert.rejects(as(null, 'select * from public.projects', [], 'anon'), { code: '42501' });
      await assert.rejects(as(null, 'select * from public.save_project($1,$2,0,$3)', ['x', content, A], 'anon'), { code: '42501' });
      await assert.rejects(save(null, 'x', 0), { code: '42501' });
      assert.deepEqual(await as(null, 'select * from public.projects'), []);
    });
    await t.test('a token/account change between click and request cannot write to the new account', async () => {
      await assert.rejects(as(B, 'select * from public.save_project($1,$2,0,$3)', ['race', content, A]), { code: '42501' });
      await assert.rejects(as(B, "select public.delete_project('project-a',1,$1)", [A]), { code: '42501' });
      assert.equal((await as(B, 'select * from public.projects')).length, 1);
    });
    await t.test('only one concurrent revision wins; stale saves and deletes fail', async () => {
      const [first, second] = await Promise.allSettled([
        save(A, 'project-a', 1, { ...content, name: 'Ny version' }),
        save(A, 'project-a', 1, { ...content, name: 'Föråldrad version' })
      ]);
      assert.equal(first.status, 'fulfilled'); assert.equal(second.status, 'rejected');
      assert.equal(second.reason.code, 'PT409');
      await assert.rejects(as(A, "select public.delete_project('project-a',1,$1)", [A]), { code: 'PT409' });
      await assert.rejects(save(A, 'project-a', 0), { code: 'PT409' });
      assert.equal((await as(A, 'select * from public.projects'))[0].content.name, 'Ny version');
    });
    await t.test('invalid project structure, missing and null fields, ids and size rejected', async () => {
      for (const value of [[], {}, { ...content, name: '' }, { ...content, templateId: null }, { ...content, templateId: 'unknown' }, { ...content, values: [] }, { ...content, name: 'x'.repeat(201) }, { ...content, values: { huge: 'x'.repeat(20971520) } }]) {
        await assert.rejects(save(A, 'invalid', 0, value), { code: '23514' });
      }
      await assert.rejects(save(A, '../escape', 0), { code: '23514' });
      await assert.rejects(save(A, 'x', -1), { code: '22023' });
    });
    await t.test('owner deletes only the current version, other owner remains', async () => {
      await as(A, "select public.delete_project('project-a',2,$1)", [A]);
      assert.deepEqual(await as(A, 'select * from public.projects'), []);
      assert.equal((await as(B, 'select * from public.projects')).length, 1);
    });
  } finally { await db.close(); }
});
