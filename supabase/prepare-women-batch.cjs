const fs = require('node:fs');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const dir = 'supabase/imports/women-batch';
const includeTypo = process.argv.includes('--include-confirmed-name-typo');
const specs = [
  { seat: 'W02', name: '문수빈', file: '여자 02번 문수빈.hwp', school: '다율고등학교', phone: '010-6935-2665', student_status: '재학생' },
  { seat: 'W03', name: '권효민', file: '여자 03번 권효민.hwp', school: '교하고(2학년 자퇴)', phone: '010-7752-9331', student_status: '자퇴생' },
  { seat: 'W05', name: '김효경', file: '여자 05번 김효경.hwp', school: '세경고', student_status: '재학생' },
  { seat: 'W07', name: '이서진', file: '여자 07번 이서진.hwp', school: '문산고(졸)', phone: '010-3320-4903', student_status: '재수생', korean_subject: '화법과 작문', math_subject: '미적분', inquiry_subject_1: '생명과학Ⅰ', inquiry_subject_2: '지구과학Ⅰ', special_notes: '입학원서: 농어촌 / 농어촌 종합' },
  { seat: 'W08', name: '김찬율', file: '여자 08번 김찬율.hwp', school: '교하고', phone: '010-8417-6040', student_status: '재학생', korean_subject: '화법과 작문', math_subject: '확률과 통계', inquiry_subject_1: '생활과 윤리', inquiry_subject_2: '사회·문화' },
];
function parseDate(raw) {
  let m = raw.match(/^(?:(\d{4})[.\-/])?(\d{1,2})[.\-/](\d{1,2})\.?$/);
  if (!m) { const korean = raw.match(/^(\d{1,2})월\s*(\d{1,2})일$/); if (korean) m = [raw, undefined, korean[1], korean[2]]; }
  if (!m) return null;
  const date = `${m[1] || 2026}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  assert.equal(new Date(date).toISOString().slice(0,10), date);
  return date;
}
const held = [];
const students = specs.map(spec => {
  const lines = JSON.parse(fs.readFileSync(`${dir}/${spec.file}.json`, 'utf8'));
  const records = [];
  for (let i=0; i<lines.length; i++) {
    if (lines[i] !== '상담기록지') continue;
    let end=lines.indexOf('상담기록지', i+1); if(end<0) end=lines.length;
    const b=lines.slice(i+1,end);
    const start=b.indexOf('상담내용기록')+1, notes=b.indexOf('비고',start);
    assert(start>0 && notes>=start);
    const content=b.slice(start,notes).join('\n');
    const special_notes=b.slice(notes+1).filter(s=>s!=='<특이사항>').join('\n');
    if(!content && !special_notes) continue;
    const original_name=b[b.indexOf('학생이름')+1];
    const original_date=b[b.indexOf('날짜')+1];
    const rawAuthor=b[b.indexOf('상담자')+1];
    const rawTime=b[b.indexOf('시간')+1];
    const record={ date:parseDate(original_date), original_name, original_date: original_date==='상담자'?'':original_date, counselor_name:rawAuthor==='시간'?'원문 미기재':rawAuthor, content, special_notes };
    if(rawTime!=='상담내용기록') record.special_notes += `${record.special_notes?'\n\n':''}원문 상담시간: ${rawTime}`;
    if (!record.date) { held.push({name:spec.name, seat:spec.seat, reason:'날짜 미기재', ...record}); continue; }
    if(original_name!==spec.name && original_name!==`${spec.name} ${spec.seat}`) {
      assert(spec.name==='김찬율' && original_name==='김찬윤' && record.date==='2026-07-06');
      if(!includeTypo) { held.push({name:spec.name, seat:spec.seat, reason:'원문 학생명 확인 대기', ...record}); continue; }
      record.special_notes += `${record.special_notes?'\n\n':''}원문 학생명은 김찬윤으로 기재되어 있으며, 사용자 확인에 따라 김찬율 기록으로 반영함.`;
    }
    assert(content);
    records.push(record);
  }
  records.sort((a,b)=>a.date.localeCompare(b.date));
  assert.equal(records.length,new Set(records.map(r=>r.date)).size);
  return {...spec, building:2, records};
});
assert.deepEqual(students.map(s=>s.records.length), [6,7,0,3,includeTypo?9:8]);
fs.writeFileSync(`${dir}/review.json`, JSON.stringify({students,held,assumed_year:2026},null,2));
fs.writeFileSync(`${dir}/review.md`, `# 여학생 5명 입력 검토\n\n연도 없는 상담일은 앞선 사용자 확인과 문서의 2026년 명시 기록을 근거로 2026년으로 정리했습니다. 날짜 없는 상담은 입력하지 않습니다. 원서의 빈 전화번호·선택과목은 기존 값을 유지합니다. 부모 연락처·생년월일·주소는 앱에 항목이 없어 제외합니다.\n\n` + students.map(s=>`## ${s.seat} ${s.name} — ${s.records.length}건\n\n학교: ${s.school}\n\n`+s.records.map(r=>`### ${r.date} · ${r.counselor_name}\n\n${r.content}\n\n${r.special_notes}\n`).join('\n')).join('\n') + '\n## 입력 보류 기록\n\n' + held.map(r=>`### ${r.seat} ${r.name} — ${r.reason}\n\n원문 날짜: ${r.original_date||'미기재'} / 상담자: ${r.counselor_name}\n\n${r.content}\n\n${r.special_notes}\n`).join('\n'));
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const payload=quote(JSON.stringify(students));
const hash=s=>crypto.createHash('md5').update(s).digest('hex');
const checks=students.flatMap(s=>s.records.map(r=>`(${quote(s.seat)}, ${quote(s.name)}, ${quote(r.date)}::date, ${quote(r.counselor_name)}, ${quote(hash(r.content))}, ${quote(hash(r.special_notes))})`));
const sql=`-- 실행용 SQL: 기존 2관 W02/W03/W05/W07/W08 학생 정보 및 2026년 상담기록
-- 날짜 미기재 기록과 빈 상담 양식은 제외. 신규 학생을 생성하지 않습니다.
begin;
lock table public.students, public.counseling_journals in share row exclusive mode;
do $import$
declare
  payload jsonb := ${payload}::jsonb;
  item jsonb;
  entry jsonb;
  target_id uuid;
  matches integer;
  author_trigger "char";
begin
  if auth.uid() is not null then raise exception '프로젝트 관리자 SQL Editor에서 실행해 주세요.'; end if;
  -- 먼저 다섯 명 모두 이름/관/좌석을 확인합니다. 불일치 시 전체 롤백됩니다.
  for item in select * from jsonb_array_elements(payload) loop
    select count(*) into matches from public.students where name=item->>'name' and building=2 and seat_number=item->>'seat';
    if matches<>1 then raise exception '기존 2관 % % 학생이 정확히 1명이어야 합니다. 현재 %명.',item->>'seat',item->>'name',matches; end if;
    for entry in select * from jsonb_array_elements(item->'records') loop
      if (entry->>'date')::date > (now() at time zone 'Asia/Seoul')::date then raise exception '미래 상담일: %',entry->>'date'; end if;
    end loop;
  end loop;
  select tgenabled into author_trigger from pg_trigger where tgrelid='public.counseling_journals'::regclass and tgname='counseling_journals_author' and not tgisinternal;
  if author_trigger is not null then alter table public.counseling_journals disable trigger counseling_journals_author; end if;
  for item in select * from jsonb_array_elements(payload) loop
    select id into target_id from public.students where name=item->>'name' and building=2 and seat_number=item->>'seat';
    update public.students set
      phone=coalesce(item->>'phone',phone), school=item->>'school', student_status=item->>'student_status',
      korean_subject=coalesce(item->>'korean_subject',korean_subject), math_subject=coalesce(item->>'math_subject',math_subject),
      inquiry_subject_1=coalesce(item->>'inquiry_subject_1',inquiry_subject_1), inquiry_subject_2=coalesce(item->>'inquiry_subject_2',inquiry_subject_2),
      special_notes=case when item->>'special_notes' is null then special_notes
        when position(item->>'special_notes' in coalesce(special_notes,''))>0 then special_notes
        else concat_ws(E'\\n',nullif(special_notes,''),item->>'special_notes') end
    where id=target_id;
    for entry in select * from jsonb_array_elements(item->'records') loop
      if not exists(select 1 from public.counseling_journals where student_id=target_id and date=(entry->>'date')::date) then
        insert into public.counseling_journals(student_id,date,counselor_id,counselor_name,content,special_notes,parent_message_sent)
        values(target_id,(entry->>'date')::date,null,entry->>'counselor_name',entry->>'content',entry->>'special_notes',false);
      end if;
    end loop;
  end loop;
  -- 실제 상담자 계정은 추정하지 않고 원문 이름만 보존. 자동 지정 트리거 상태 복원.
  if author_trigger='O' then alter table public.counseling_journals enable trigger counseling_journals_author;
  elsif author_trigger='A' then alter table public.counseling_journals enable always trigger counseling_journals_author;
  elsif author_trigger='R' then alter table public.counseling_journals enable replica trigger counseling_journals_author;
  end if;
end;
$import$;
with expected(seat,name,date,author,content_hash,notes_hash) as (values
${checks.join(',\n')}
)
select e.seat as seat_number,e.name,e.date,e.author as original_counselor,
  case when exists(select 1 from public.counseling_journals j join public.students s on s.id=j.student_id
    where s.building=2 and s.seat_number=e.seat and s.name=e.name and j.date=e.date and j.counselor_name=e.author
      and md5(j.content)=e.content_hash and md5(j.special_notes)=e.notes_hash)
    then '반영됨' else '확인 필요: 같은 날짜의 기존 기록 보존' end as status
from expected e
union all
select 'W05','김효경',null::date,null,'학생 정보만 반영 (작성된 상담 없음)'
order by seat_number,date;
commit;
`;
fs.writeFileSync(`${dir}/apply.sql`,sql);
console.log(JSON.stringify({counts:students.map(s=>({name:s.name,count:s.records.length,dates:s.records.map(r=>r.date)})),held:held.map(r=>({name:r.name,reason:r.reason}))},null,2));
