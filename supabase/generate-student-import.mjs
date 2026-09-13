import fs from 'node:fs';
const read = p => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s);
const previous = read('supabase/migrations/202609130024_activity_student_snapshots.sql');
const trigger = previous.slice(previous.indexOf('create or replace function'), previous.lastIndexOf('commit;')).replace("'counseling_cycle_weeks']", "'counseling_cycle_weeks','counseling_requested']");
write('supabase/migrations/202609140025_student_counseling_preference.sql', `begin;
-- 구버전 학생 테이블에도 필요한 열을 먼저 추가합니다. 기존 값은 보존합니다.
-- 기존 학생의 관/좌석을 추정하지 않으므로 미배정 값은 NULL로 유지합니다.
alter table public.students add column if not exists building smallint;
alter table public.students add column if not exists seat_number text;
create unique index if not exists students_import_building_seat_unique
  on public.students (building, seat_number);
alter table public.students add column if not exists counseling_cycle_weeks smallint not null default 1;
alter table public.students add column if not exists student_status text;
alter table public.students add column if not exists gender text;
alter table public.students add column if not exists phone text;
alter table public.students add column if not exists counseling_requested boolean not null default true;
alter table public.students add column if not exists source_sheet jsonb;
update public.students set counseling_requested = false where counseling_cycle_weeks = 0;
alter table public.students drop constraint if exists students_student_status_check;
update public.students set student_status = '재학생' where student_status = '현역';
alter table public.students add constraint students_student_status_check
  check (student_status in ('재학생', '재수생', 'N수생', '자퇴생', '공시생'));
comment on column public.students.counseling_requested is '상담 희망 여부. false이면 정기 상담 필요 목록에서 제외';
comment on column public.students.source_sheet is '사용자 첨부 표 원문. 미확인 날짜는 실제 상담/전송 실적이 아님';
${trigger}
commit;
`);
const [header, ...lines] = read('supabase/student_sheet_20260914.tsv').trimEnd().split(/\r?\n/);
const keys = header.split('\t');
const rows = lines.map(line => Object.fromEntries(keys.map((key, i) => [key, line.split('\t')[i] || ''])));
const quote = s => "'" + s.replaceAll("'", "''") + "'";
const values = rows.map(r => {
  const source = {last_date: r.last_date || null, next_date: r.next_date || null, parent_sent: r.parent_sent || null, note: r.note, student_status: r.status};
  return '  (' + [quote(r.name), r.seat[0] === 'M' ? 1 : 2, quote(r.seat[0] === 'M' ? '남' : '여'), quote(r.seat), quote(r.status), Number(r.cycle), r.requested, quote(JSON.stringify(source)) + '::jsonb'].join(', ') + ')';
});
write('supabase/seed_students_20260914.sql', `-- 025 적용 후 실행. M=1관, W=2관. 이름 없는 좌석은 제외.
-- 동일 좌석의 다른 이름은 덮어쓰지 않습니다. 마지막 SELECT에서 충돌을 확인합니다.
-- 원문 날짜로 상담일지/담당자/문자 발송 실적을 만들지 않습니다.
begin;
lock table public.students in share row exclusive mode;
with sheet_rows (
  name, building, gender, seat_number, student_status,
  counseling_cycle_weeks, counseling_requested, source_sheet
) as (values
${values.join(',\n')}
), applied as (
insert into public.students (name, building, gender, seat_number, student_status, counseling_cycle_weeks, counseling_requested, source_sheet)
select i.name, i.building, i.gender, i.seat_number, i.student_status, i.counseling_cycle_weeks, i.counseling_requested, i.source_sheet
from sheet_rows i
where not exists (
  -- 관/좌석이 없는 기존 동명 학생은 자동 연결하거나 중복 생성하지 않습니다.
  select 1 from public.students s where s.name = i.name
    and (s.building is null or s.seat_number is null or btrim(s.seat_number) = '')
)
on conflict (building, seat_number) do update set
  gender = excluded.gender,
  student_status = excluded.student_status,
  counseling_cycle_weeks = excluded.counseling_cycle_weeks,
  counseling_requested = excluded.counseling_requested,
  source_sheet = excluded.source_sheet
where students.name = excluded.name and students.source_sheet is null
returning id, building, seat_number, name, counseling_requested, counseling_cycle_weeks
)
-- 한 결과표에서 57명 각각의 입력 여부와 확인이 필요한 대상을 표시합니다.
select i.building, i.seat_number, i.name,
  case
    when exists (select 1 from public.students u where u.name = i.name
      and (u.building is null or u.seat_number is null or btrim(u.seat_number) = ''))
      then '확인 필요: 관/좌석 없는 동명 학생 존재'
    when a.id is not null then '반영됨'
    when s.id is null then '미입력'
    when s.name <> i.name then '확인 필요: 해당 좌석에 다른 학생 존재'
    when s.source_sheet is not null then '반영됨'
    else '확인 필요'
  end as import_status,
  coalesce(a.name, s.name) as existing_name,
  coalesce(a.counseling_requested, s.counseling_requested) as counseling_requested,
  coalesce(a.counseling_cycle_weeks, s.counseling_cycle_weeks) as counseling_cycle_weeks
from sheet_rows i
left join public.students s using (building, seat_number)
left join applied a on a.building = i.building and a.seat_number = i.seat_number
order by i.building, i.seat_number;
commit;
`);
console.log(`${rows.length} students; ${rows.filter(r => r.requested === 'false').length} declined counseling`);
// 통합 실행은 구조 변경과 데이터 입력을 하나의 트랜잭션으로 처리합니다.
// 확인된 구형 DB에는 profiles/activity_logs 구조가 보장되지 않습니다.
// 통합 가져오기는 기존 트리거를 교체하지 않고 학생 구조와 데이터만 변경합니다.
const migration = read('supabase/migrations/202609140025_student_counseling_preference.sql').split('create or replace function public.record_activity()')[0];
const seed = read('supabase/seed_students_20260914.sql').replace(/^begin;\r?\n/m, '');
write('supabase/apply_student_sheet_20260914.sql', migration + '\n' + seed);
