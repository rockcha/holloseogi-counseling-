import { PGlite } from '../.npm-cache/_npx/5451a941ffe99421/node_modules/@electric-sql/pglite/dist/index.js';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const sql=fs.readFileSync('supabase/imports/women-batch/apply.sql','utf8');
const {students,held}=JSON.parse(fs.readFileSync('supabase/imports/women-batch/review.json','utf8'));
const total=students.reduce((n,s)=>n+s.records.length,0);
const db=new PGlite();
try {
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as 'select null::uuid';
    create table students(id uuid primary key default gen_random_uuid(),name text,building int,seat_number text,phone text,school text,student_status text,
      korean_subject text,math_subject text,inquiry_subject_1 text,inquiry_subject_2 text,special_notes text,parent_phone text);
    create table counseling_journals(id uuid primary key default gen_random_uuid(),student_id uuid references students(id),date date,
      counselor_id uuid,counselor_name text,content text,special_notes text,parent_message_sent boolean);
    create function reject_author() returns trigger language plpgsql as $$ begin raise exception 'auth required'; end; $$;
    create trigger counseling_journals_author before insert on counseling_journals for each row execute function reject_author();`);
  for(const s of students) await db.query("insert into students(name,building,seat_number,phone,korean_subject,special_notes,parent_phone) values($1,2,$2,'기존전화','기존과목','기존메모','보존')",[s.name,s.seat]);
  const res=await db.exec(sql);
  const report=res.find(r=>r.fields.some(f=>f.name==='status')).rows;
  assert.equal(report.length,total+1);
  assert.equal(report.filter(r=>r.status==='반영됨').length,total);
  for(const s of students){
    const rows=(await db.query(`select j.date::text,j.content,j.special_notes,j.counselor_name,j.counselor_id,j.parent_message_sent
      from counseling_journals j join students s on s.id=j.student_id where s.seat_number=$1 order by j.date`,[s.seat])).rows;
    assert.equal(rows.length,s.records.length);
    rows.forEach((r,i)=>{
      for(const key of ['date','content','special_notes','counselor_name'])assert.equal(r[key],s.records[i][key]);
      assert.equal(r.counselor_id,null);assert.equal(r.parent_message_sent,false);
    });
  }
  await db.exec(sql);
  assert.equal((await db.query('select count(*)::int as n from counseling_journals')).rows[0].n,total);
  const empty=(await db.query("select * from students where seat_number='W05'")).rows[0];
  assert.equal(empty.phone,'기존전화');assert.equal(empty.korean_subject,'기존과목');assert.equal(empty.special_notes,'기존메모');
  assert.equal((await db.query("select special_notes from students where seat_number='W07'")).rows[0].special_notes,'기존메모\n입학원서: 농어촌 / 농어촌 종합');
  assert.equal((await db.query("select tgenabled from pg_trigger where tgname='counseling_journals_author'")).rows[0].tgenabled,'O');
  await db.exec("update counseling_journals set content='기존 기록 보존' where date='2026-09-10';");
  const conflict=await db.exec(sql);
  assert(conflict.find(r=>r.fields.some(f=>f.name==='status')).rows.some(r=>r.status.includes('확인 필요')));
  // 전체 대상 중 하나가 없어도 부분 업데이트 없이 실패해야 합니다.
  await db.exec("update students set name='다른학생' where seat_number='W05'; update students set school='보존학교' where seat_number='W02';");
  await assert.rejects(db.exec(sql),/정확히 1명/);
  await db.exec('rollback;');
  assert.equal((await db.query("select school from students where seat_number='W02'")).rows[0].school,'보존학교');
  console.log(`PASS: ${total} exact records, date order, empty fields preserved, idempotency, conflict report, trigger restoration, missing-student rollback; ${held.length} held records`);
}finally{await db.close();}
