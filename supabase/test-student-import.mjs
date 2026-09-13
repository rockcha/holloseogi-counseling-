// node supabase/test-student-import.mjs <path to @electric-sql/pglite/dist/index.js>
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const sql = fs.readFileSync('supabase/apply_student_sheet_20260914.sql', 'utf8');
assert(!sql.includes('imported_students'));
assert(!sql.includes('create temporary table'));
const db = new PGlite();
try {
  await db.exec(`create table public.students (
    id uuid primary key default gen_random_uuid(), name text not null,
    gender text, phone text, parent_phone text, parent_relation text, memo text
  );`);
  const results = await db.exec(sql);
  const report = results.find(r => r.fields.some(f => f.name === 'import_status'));
  assert.equal(report.rows.length, 57);
  assert(report.rows.every(r => r.import_status === '반영됨'));
  assert.equal((await db.query('select count(*)::int as n from students')).rows[0].n, 57);
  assert.equal((await db.query('select count(*)::int as n from students where not counseling_requested')).rows[0].n, 5);
  await db.exec(sql);
  assert.equal((await db.query('select count(*)::int as n from students')).rows[0].n, 57);
  // 기존 동명 학생과 기존 좌석 충돌은 보존하며 57명 전체 결과에 표시합니다.
  await db.exec(`delete from students where seat_number = 'M01';
    insert into students (name, parent_phone, parent_relation, memo)
      values ('신종은', 'test-parent-phone', '보호자', '보존할 메모');
    update students set name = '기존 다른 학생' where seat_number = 'W01';`);
  const again = await db.exec(sql);
  const conflicts = again.find(r => r.fields.some(f => f.name === 'import_status')).rows;
  assert.equal(conflicts.length, 57);
  assert.match(conflicts.find(r => r.seat_number === 'M01').import_status, /동명 학생/);
  assert.match(conflicts.find(r => r.seat_number === 'W01').import_status, /다른 학생/);
  const saved = (await db.query("select * from students where name = '신종은'")).rows;
  assert.equal(saved.length, 1);
  assert.equal(saved[0].building, null);
  assert.equal(saved[0].memo, '보존할 메모');
  assert.equal(saved[0].parent_phone, 'test-parent-phone');
  await db.exec('create role authenticated;');
  const diagnosis = await db.query(fs.readFileSync('supabase/diagnose_dashboard_20260914.sql', 'utf8'));
  assert(diagnosis.rows.some(r => r.target === 'counseling_plans' && r.status === '없음'));
  assert(diagnosis.rows.some(r => r.target === 'students' && r.status === '필요한 열 있음'));
  assert(diagnosis.rows.some(r => r.category === '미배정 학생' && r.target === '신종은'));
  console.log('PASS: legacy schema, 57 imports, 5 declined, accurate result rows, idempotency, name/seat conflicts, preserved parent details and memo');
} finally {
  await db.close();
}
