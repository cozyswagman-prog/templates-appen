// Real migration SQL in local Postgres. storage.* is a schema fixture;
// hosted Storage file-size/MIME enforcement and concurrent sessions need live QA.
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const name = i => i.toString(16).padStart(64, '0') + '.png';
test('Private image migration: ownership, immutable objects, reservations and bounded quota', async t => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon nologin; create role authenticated nologin;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create schema storage;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(bucket_id text references storage.buckets(id), name text, primary key(bucket_id,name));
      alter table storage.objects enable row level security;
      grant usage on schema auth,storage,public to authenticated,anon;
      grant select,insert,update,delete on storage.objects to authenticated,anon;
      insert into auth.users values('${A}'),('${B}');`);
    await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/202610040001_private_images.sql'),'utf8'));
    async function as(id, sql, args = [], role = 'authenticated') {
      await db.exec('set role ' + role);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || '']);
      try { return (await db.query(sql,args)).rows; } finally { await db.exec('reset role'); }
    }
    const reserve = (id, image) => as(id,'select public.reserve_project_image($1,$2)',[image,id]);
    const upload = (id, object) => as(id,"insert into storage.objects values('project-images',$1)",[object]);
    await t.test('bucket is private with size and MIME constraints configured', async () => {
      const bucket = (await db.query('select * from storage.buckets')).rows[0];
      assert.equal(bucket.public,false); assert.equal(Number(bucket.file_size_limit),2097152);
      assert.deepEqual(bucket.allowed_mime_types,['image/png','image/jpeg','image/webp','image/gif']);
    });
    await t.test('reservation requires matching identity, rejects paths and cannot be inserted directly', async () => {
      await assert.rejects(as(B,'select public.reserve_project_image($1,$2)',[name(1),A]),{code:'42501'});
      await assert.rejects(reserve(A,'../other.png'),{code:'22023'});
      await assert.rejects(as(null,'select public.reserve_project_image($1,$2)',[name(1),A],'anon'),{code:'42501'});
      await assert.rejects(as(A,'insert into public.project_images(owner_id,name) values($1,$2)',[A,name(1)]),{code:'42501'});
    });
    await t.test('only reserved exact owner paths allow upload and reads', async () => {
      await assert.rejects(upload(A,A+'/'+name(1)),{code:'42501'});
      await reserve(A,name(1)); await upload(A,A+'/'+name(1));
      await assert.rejects(upload(B,A+'/'+name(1)),{code:'42501'});
      await assert.rejects(upload(A,A+'/'+name(1)+'/extra'),{code:'42501'});
      assert.equal((await as(A,'select * from storage.objects')).length,1);
      assert.deepEqual(await as(B,'select * from storage.objects'),[]);
      assert.deepEqual(await as(B,'select * from public.project_images'),[]);
      assert.deepEqual(await as(null,'select * from storage.objects',[],'anon'),[]);
    });
    await t.test('objects cannot be overwritten, renamed or removed by a client', async () => {
      assert.deepEqual(await as(A,"update storage.objects set name='changed' returning *"),[]);
      assert.deepEqual(await as(A,'delete from storage.objects returning *'),[]);
      assert.equal((await as(A,'select * from storage.objects')).length,1);
      await assert.rejects(as(A,'delete from public.project_images'),{code:'42501'});
    });
    await t.test('100 reservations cap future objects; retry does not spend another place; accounts independent', async () => {
      for(let i=2;i<=100;i++) await reserve(A,name(i));
      await assert.rejects(reserve(A,name(101)),{code:'PT413'});
      await reserve(A,name(1));
      assert.equal((await as(A,'select * from public.project_images')).length,100);
      await reserve(B,name(101)); await upload(B,B+'/'+name(101));
      assert.equal((await as(B,'select * from public.project_images')).length,1);
      assert.equal((await as(B,'select * from storage.objects')).length,1);
    });
  } finally { await db.close(); }
});
