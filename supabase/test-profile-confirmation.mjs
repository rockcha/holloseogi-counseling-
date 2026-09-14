import { PGlite } from '../.npm-cache/_npx/5451a941ffe99421/node_modules/@electric-sql/pglite/dist/index.js';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
const migration = fs.readFileSync('supabase/migrations/202609140028_profile_after_email_confirmation.sql', 'utf8');
const profiles = async () => (await db.query('select * from public.profiles order by id')).rows;
try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql as 'select null::uuid';
    create table public.counsels (id uuid);
  `);
  await db.exec(fs.readFileSync('supabase/migrations/202609120002_teacher_approval.sql', 'utf8'));
  await db.exec(`
    insert into auth.users values
      ('00000000-0000-0000-0000-000000000001', '{"name":"기존 승인 회원"}', null),
      ('00000000-0000-0000-0000-000000000002', '{"name":"기존 대기 회원"}', null);
    update public.profiles set is_teacher = true where id = '00000000-0000-0000-0000-000000000001';
  `);
  const before = await profiles();
  await db.exec(migration);
  await db.exec(migration);
  assert.deepEqual(await profiles(), before);
  await db.exec(`update auth.users set email_confirmed_at = now(), raw_user_meta_data = '{"name":"덮어쓰면 안 됨"}';`);
  assert.deepEqual(await profiles(), before);
  await db.exec(`insert into auth.users values ('00000000-0000-0000-0000-000000000003', '{"name":"새 회원","is_teacher":true}', null);`);
  assert.deepEqual(await profiles(), before);
  await db.exec(`update auth.users set raw_user_meta_data = raw_user_meta_data where id = '00000000-0000-0000-0000-000000000003';`);
  assert.deepEqual(await profiles(), before);
  await db.exec(`update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-000000000003';`);
  const confirmed = await profiles();
  assert.equal(confirmed.length, 3);
  assert.equal(confirmed[2].name, '새 회원');
  assert.equal(confirmed[2].is_teacher, false);
  await db.exec(`update auth.users set email_confirmed_at = now();`);
  assert.deepEqual(await profiles(), confirmed);
  await db.exec(`insert into auth.users values ('00000000-0000-0000-0000-000000000004', '{}', now());`);
  const final = await profiles();
  assert.equal(final.length, 4);
  assert.equal(final[3].name, '이름 확인 필요');
  assert.equal(final[3].is_teacher, false);
  assert.deepEqual(final.slice(0, 2), before);
  // Simulate a confirmed account whose profile was missing before deployment.
  await db.exec(`
    alter table auth.users disable trigger create_member_profile;
    insert into auth.users values
      ('00000000-0000-0000-0000-000000000005', '{"name":"누락 회원","is_teacher":true}', now()),
      ('00000000-0000-0000-0000-000000000006', '{"name":"미인증 회원"}', null);
    alter table auth.users enable trigger create_member_profile;
  `);
  const repair = fs.readFileSync('supabase/migrations/202609140029_backfill_confirmed_profiles.sql', 'utf8');
  await db.exec(repair);
  const repaired = await profiles();
  assert.deepEqual(repaired.slice(0, 4), final);
  assert.equal(repaired.length, 5);
  assert.equal(repaired[4].name, '누락 회원');
  assert.equal(repaired[4].is_teacher, false);
  await db.exec(repair);
  assert.deepEqual(await profiles(), repaired);
  await db.exec(`update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-000000000006';`);
  assert.equal((await profiles()).length, 6);
  const beforeSignupMigration = await profiles();
  await db.exec(`insert into auth.users values ('00000000-0000-0000-0000-000000000007', '{"name":"기존 미인증"}', null);`);
  const signupMigration = fs.readFileSync('supabase/migrations/202609140030_profile_on_signup.sql', 'utf8');
  await db.exec(signupMigration);
  const afterSignupMigration = await profiles();
  assert.equal(afterSignupMigration.length, 7);
  assert.deepEqual(afterSignupMigration.slice(0, 6), beforeSignupMigration);
  assert.equal(afterSignupMigration[6].is_teacher, false);
  await db.exec(signupMigration);
  assert.deepEqual(await profiles(), afterSignupMigration);
  await db.exec(`insert into auth.users values ('00000000-0000-0000-0000-000000000008', '{"name":"인증 없이 가입","is_teacher":true}', null);`);
  assert.equal((await profiles()).length, 8);
  assert.equal((await profiles())[7].is_teacher, false);
  const authRecord = await db.query(`select email_confirmed_at from auth.users where id = '00000000-0000-0000-0000-000000000007'`);
  assert.equal(authRecord.rows[0].email_confirmed_at, null);
  console.log('PASS: 030 immediate profile creation, missing unconfirmed profiles added, existing profiles and auth confirmation unchanged, repeat application safe');
  console.log('PASS: confirmed missing profiles added, existing values unchanged, unconfirmed users excluded, repair idempotent, future confirmation supported');
  console.log('PASS: existing profiles preserved, unconfirmed signup deferred, confirmation creates unapproved profile, repeated events and migration safe, confirmed inserts supported');
} finally {
  await db.close();
}
