// Local HWP extraction. Usage: node supabase/prepare-kim-dain-import.cjs [confirmed year]
const fs = require('node:fs');
const zlib = require('node:zlib');
const assert = require('node:assert/strict');
const CFB = require('../.npm-cache/_npx/cc08cee51660a8ab/node_modules/cfb');
const source = 'C:/Users/user/Downloads/여자 01번 김다인.hwp';
const doc = CFB.read(fs.readFileSync(source), { type: 'buffer' });
const paragraphs = [];
for (let i = 0; i < doc.FullPaths.length; i++) {
  if (!/BodyText\/Section\d+$/.test(doc.FullPaths[i])) continue;
  const data = zlib.inflateRawSync(doc.FileIndex[i].content);
  let pos = 0;
  while (pos + 4 <= data.length) {
    const header = data.readUInt32LE(pos); pos += 4;
    const tag = header & 1023;
    let size = header >>> 20;
    if (size === 4095) { size = data.readUInt32LE(pos); pos += 4; }
    const payload = data.subarray(pos, pos + size); pos += size;
    if (tag !== 67) continue;
    let text = '';
    for (let j = 0; j + 1 < payload.length; j += 2) {
      const code = payload.readUInt16LE(j);
      if (code < 32) {
        if ([1,2,3,4,5,6,7,8,9,11,12,14,15,16,17,18,19,20,21,22,23].includes(code)) j += 14;
        else if (code === 13) text += '\n';
      } else text += String.fromCharCode(code);
    }
    if (text.trim()) paragraphs.push(text.trim());
  }
}
const year = process.argv[2] ? Number(process.argv[2]) : null;
if (year !== null) assert(Number.isInteger(year) && year >= 2000 && year <= 2100);
const records = [];
for (let i = 0; i < paragraphs.length; i++) {
  if (paragraphs[i] !== '상담기록지') continue;
  let end = paragraphs.indexOf('상담기록지', i + 1);
  if (end < 0) end = paragraphs.length;
  const block = paragraphs.slice(i + 1, end);
  const rawDate = block[block.indexOf('날짜') + 1];
  if (!/^\d{1,2}\.\d{1,2}$/.test(rawDate)) continue;
  assert.equal(block[block.indexOf('학생이름') + 1], '김다인');
  const [month, day] = rawDate.split('.').map(Number);
  const rawAuthor = block[block.indexOf('상담자') + 1];
  const contentStart = block.indexOf('상담내용기록') + 1;
  const notesStart = block.indexOf('비고', contentStart);
  records.push({
    date: year ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null,
    original_date: rawDate,
    counselor_name: rawAuthor === '시간' ? '원문 미기재' : rawAuthor,
    content: block.slice(contentStart, notesStart).join('\n'),
    special_notes: block.slice(notesStart + 1).filter(s => s !== '<특이사항>').join('\n'),
  });
}
assert.equal(records.length, 14);
assert.equal(new Set(records.map(r => r.original_date)).size, 14);
assert(records.every(r => r.content));
const student = { name: '김다인', building: 2, seat_number: 'W01', phone: '010-7113-4891', student_status: '재수생', school: '고양외고(졸)', korean_subject: '언어와 매체', math_subject: '확률과 통계', inquiry_subject_1: '생활과 윤리', inquiry_subject_2: '윤리와 사상' };
const dir = 'supabase/imports/kim-dain';
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(`${dir}/review.json`, JSON.stringify({ source, confirmed_year: year, student, records }, null, 2));
fs.writeFileSync(`${dir}/review.md`, `# 김다인 학생 정보 및 상담기록\n\n- 대상: 기존 2관 W01 김다인 (신규 학생 생성 없음)\n- 상담 연도: ${year ?? '확인 대기 — 원서 인쇄 연도 2025, 상담란은 월·일만 있음'}\n- 학교: ${student.school}\n- 학생 연락처: ${student.phone}\n- 학적: 재수생\n- 선택과목: 언어와 매체 / 확률과 통계 / 생활과 윤리 / 윤리와 사상\n- 학생 특이사항: 원서에 공란이므로 기존 내용 유지\n- 부모 연락처·생년 정보: 현재 학생 입력 항목에 없어 반영 제외\n- 상담자 계정 ID는 이름으로 추정하지 않으며 원문 이름만 보존\n- 문자 발송 여부와 상담 시간은 원문 근거가 없어 기록하지 않음\n\n` + records.map(r => `## ${r.date ?? r.original_date + ' (연도 확인 대기)'} · ${r.counselor_name}\n\n${r.content}\n\n${r.special_notes ? '### 비고\n\n' + r.special_notes + '\n' : ''}`).join('\n'));
if (year === null) { console.log('Extracted 14 records. SQL awaits confirmed year.'); process.exit(0); }
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const payload = JSON.stringify(records);
fs.writeFileSync(`${dir}/apply.sql`, `-- 기존 2관 W01 김다인만 수정합니다. 학생/과목 열과 상담일지 테이블이 설치된 앱 프로젝트에서 실행하세요.
-- 문서 상담자 이름을 보존하며 로그인 계정에 과거 실적을 임의 귀속하지 않습니다.
begin;
lock table public.students, public.counseling_journals in share row exclusive mode;
do $import$
declare
  target_id uuid;
  matches integer;
  author_trigger "char";
  row_data jsonb;
begin
  if auth.uid() is not null then
    raise exception '이 SQL은 프로젝트 관리자의 SQL Editor 전용입니다.';
  end if;
  select count(*) into matches from public.students where name = '김다인' and building = 2 and seat_number = 'W01';
  if matches <> 1 then
    raise exception '기존 2관 W01 김다인 학생이 정확히 1명이어야 합니다. 현재 %명. 학생을 추가하지 않았습니다.', matches;
  end if;
  select id into target_id from public.students where name = '김다인' and building = 2 and seat_number = 'W01';
  if exists (select 1 from jsonb_array_elements(${quote(payload)}::jsonb) x where (x->>'date')::date > (now() at time zone 'Asia/Seoul')::date) then
    raise exception '미래 상담일이 포함되어 있습니다. 연도를 확인하세요.';
  end if;
  update public.students set
    phone = ${quote(student.phone)}, student_status = '재수생', school = ${quote(student.school)},
    korean_subject = ${quote(student.korean_subject)}, math_subject = ${quote(student.math_subject)},
    inquiry_subject_1 = ${quote(student.inquiry_subject_1)}, inquiry_subject_2 = ${quote(student.inquiry_subject_2)}
  where id = target_id;

  -- 자동 로그인 상담자 지정 트리거만 트랜잭션 내에서 잠시 중지하고 원래 상태로 복구합니다.
  -- 외래키, 활동 로그, 그 외 트리거는 유지합니다.
  select tgenabled into author_trigger from pg_trigger
    where tgrelid = 'public.counseling_journals'::regclass and tgname = 'counseling_journals_author' and not tgisinternal;
  if author_trigger is not null then
    alter table public.counseling_journals disable trigger counseling_journals_author;
  end if;
  for row_data in select * from jsonb_array_elements(${quote(payload)}::jsonb) loop
    if not exists (select 1 from public.counseling_journals where student_id = target_id and date = (row_data->>'date')::date) then
      insert into public.counseling_journals(student_id, date, counselor_id, counselor_name, content, special_notes, parent_message_sent)
      values (target_id, (row_data->>'date')::date, null, row_data->>'counselor_name', row_data->>'content', row_data->>'special_notes', false);
    end if;
  end loop;
  if author_trigger = 'O' then alter table public.counseling_journals enable trigger counseling_journals_author;
  elsif author_trigger = 'A' then alter table public.counseling_journals enable always trigger counseling_journals_author;
  elsif author_trigger = 'R' then alter table public.counseling_journals enable replica trigger counseling_journals_author;
  end if;
end;
$import$;
-- 날짜가 같은 기존 기록은 덮어쓰지 않습니다. 내용이 다르면 확인 대상으로 표시합니다.
with source as (select * from jsonb_to_recordset(${quote(payload)}::jsonb)
  as r(date date, original_date text, counselor_name text, content text, special_notes text))
select r.date, r.counselor_name as original_counselor,
  case when exists (select 1 from public.counseling_journals j join public.students s on s.id = j.student_id
    where s.name = '김다인' and s.building = 2 and s.seat_number = 'W01' and j.date = r.date
      and j.content = r.content and j.special_notes = r.special_notes and j.counselor_name = r.counselor_name)
    then '반영됨' else '확인 필요: 같은 날짜의 기존 상담기록 보존' end as status
from source r order by r.date;
commit;
`);
console.log(`Prepared ${year} import: 14 records; no remote changes.`);
