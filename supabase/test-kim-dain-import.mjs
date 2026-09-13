import { PGlite } from '../.npm-cache/_npx/5451a941ffe99421/node_modules/@electric-sql/pglite/dist/index.js';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const sql = fs.readFileSync('supabase/imports/kim-dain/apply.sql', 'utf8');
const review = JSON.parse(fs.readFileSync('supabase/imports/kim-dain/review.json', 'utf8'));
const db = new PGlite();
try {
  await db.exec(`create schema auth;
    create function auth.uid() returns uuid language sql as 'select null::uuid';
    create table students (id uuid primary key default gen_random_uuid(), name text, building int, seat_number text,
      phone text, student_status text, school text, korean_subject text, math_subject text,
      inquiry_subject_1 text, inquiry_subject_2 text, special_notes text, parent_phone text);
    create table counseling_journals (id uuid primary key default gen_random_uuid(), student_id uuid references students(id),
      date date, counselor_id uuid, counselor_name text, content text, special_notes text, parent_message_sent boolean);
    create function reject_author() returns trigger language plpgsql as $$ begin raise exception 'No authenticated teacher'; end; $$;
    create trigger counseling_journals_author before insert on counseling_journals for each row execute function reject_author();
    insert into students(name,building,seat_number,special_notes,parent_phone) values ('김다인',2,'W01','기존 특이사항','보존');
    insert into students(name,building,seat_number,phone) values ('김다인',1,'W01','다른 학생');`);
  const result = await db.exec(sql);
  const report = result.find(r => r.fields.some(f => f.name === 'status'));
  assert.equal(report.rows.length,14);
  assert(report.rows.every(r=>r.status === '반영됨'));
  const records = (await db.query('select date::text, counselor_id, counselor_name, content, special_notes, parent_message_sent from counseling_journals order by date')).rows;
  assert.equal(records.length,14);
  assert.equal(records[0].date, '2026-03-09');
  assert.equal(records[13].date, '2026-08-25');
  assert(records.every(r=>r.counselor_id === null && r.parent_message_sent === false));
  for (let i=0; i<14; i++) {
    assert.equal(records[i].content, review.records[i].content);
    assert.equal(records[i].special_notes, review.records[i].special_notes);
    assert.equal(records[i].counselor_name, review.records[i].counselor_name);
  }
  assert.equal(records.find(r=>r.date==='2026-05-18').counselor_name,'원문 미기재');
  assert.equal((await db.query("select tgenabled from pg_trigger where tgname='counseling_journals_author'")).rows[0].tgenabled,'O');
  await db.exec(sql);
  assert.equal((await db.query('select count(*)::int as n from counseling_journals')).rows[0].n,14);
  assert.equal((await db.query("select phone from students where building=1")).rows[0].phone,'다른 학생');
  const student = (await db.query('select * from students where building=2')).rows[0];
  assert.equal(student.special_notes,'기존 특이사항');
  assert.equal(student.parent_phone,'보존');
  assert.equal(student.school,'고양외고(졸)');
  await db.exec("update counseling_journals set content='기존 수정 기록' where date='2026-03-09';");
  const conflict = await db.exec(sql);
  assert.match(conflict.find(r=>r.fields.some(f=>f.name==='status')).rows[0].status,/확인 필요/);
  assert.equal((await db.query("select content from counseling_journals where date='2026-03-09'")).rows[0].content,'기존 수정 기록');
  console.log('PASS: 14 original records, confirmed 2026 dates, exact student match, unchanged unrelated fields/student, original counselor labels, restored trigger, idempotency, preserved date conflicts');
} finally { await db.close(); }
