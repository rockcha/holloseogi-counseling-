-- 025 적용 후 실행. M=1관, W=2관. 이름 없는 좌석은 제외.
-- 동일 좌석의 다른 이름은 덮어쓰지 않습니다. 마지막 SELECT에서 충돌을 확인합니다.
-- 원문 날짜로 상담일지/담당자/문자 발송 실적을 만들지 않습니다.
begin;
lock table public.students in share row exclusive mode;
with sheet_rows (
  name, building, gender, seat_number, student_status,
  counseling_cycle_weeks, counseling_requested, source_sheet
) as (values
  ('신종은', 1, '남', 'M01', '재학생', 1, false, '{"last_date":"2027-08-10","next_date":"2027-08-17","parent_sent":null,"note":"","student_status":"재학생"}'::jsonb),
  ('박민우', 1, '남', 'M03', '재학생', 1, true, '{"last_date":null,"next_date":"1900-01-07","parent_sent":null,"note":"","student_status":"재학생"}'::jsonb),
  ('오연우', 1, '남', 'M04', '재학생', 1, true, '{"last_date":"2027-09-01","next_date":"2027-09-08","parent_sent":"9.11","note":"","student_status":"재학생"}'::jsonb),
  ('오승우', 1, '남', 'M05', '재학생', 1, true, '{"last_date":null,"next_date":"3000-08-01","parent_sent":null,"note":"","student_status":"재학생"}'::jsonb),
  ('이강진', 1, '남', 'M06', 'N수생', 1, true, '{"last_date":null,"next_date":"3000-08001","parent_sent":null,"note":"","student_status":"N수생"}'::jsonb),
  ('이태현', 1, '남', 'M07', '재학생', 1, true, '{"last_date":"2026-08-25","next_date":"2026-09-01","parent_sent":"8.25","note":"","student_status":"재학생"}'::jsonb),
  ('박진언', 1, '남', 'M08', '재학생', 1, true, '{"last_date":"2026-07-19","next_date":"2026-07-26","parent_sent":null,"note":"","student_status":"재학생"}'::jsonb),
  ('박준영', 1, '남', 'M09', '재학생', 2, true, '{"last_date":"2026-08-21","next_date":"2026-09-04","parent_sent":"8.21","note":"2주에 한 번 상담","student_status":"재학생"}'::jsonb),
  ('정재원', 1, '남', 'M11', 'N수생', 1, false, '{"last_date":"2027-09-09","next_date":"2027-09-16","parent_sent":null,"note":"","student_status":"N수생"}'::jsonb),
  ('김진우', 1, '남', 'M12', '재수생', 1, true, '{"last_date":"2026-09-10","next_date":"2026-09-17","parent_sent":"9.11","note":"","student_status":"재수생"}'::jsonb),
  ('김민찬', 1, '남', 'M16', '재학생', 1, true, '{"last_date":"2026-09-09","next_date":"2026-09-16","parent_sent":"9.11","note":"","student_status":"재학생"}'::jsonb),
  ('유승민', 1, '남', 'M17', '재학생', 2, true, '{"last_date":"2026-08-27","next_date":"2026-09-10","parent_sent":"8.27","note":"2주에 한 번 상담","student_status":"재학생"}'::jsonb),
  ('박도현', 1, '남', 'M18', '재수생', 1, true, '{"last_date":"2026-09-11","next_date":"2026-09-18","parent_sent":"9.11","note":"","student_status":"재수생"}'::jsonb),
  ('노연우', 1, '남', 'M20', '재수생', 2, true, '{"last_date":"2026-08-14","next_date":"2026-08-28","parent_sent":"8.14","note":"2주에 한 번 상담","student_status":"재수생"}'::jsonb),
  ('장연우', 1, '남', 'M21', '재학생', 1, true, '{"last_date":"2026-08-22","next_date":"2026-08-29","parent_sent":"8.22","note":"","student_status":"재학생"}'::jsonb),
  ('신정현', 1, '남', 'M22', '재수생', 1, true, '{"last_date":null,"next_date":"1900-01-07","parent_sent":null,"note":"","student_status":"재수생"}'::jsonb),
  ('황윤재', 1, '남', 'M26', '재학생', 2, true, '{"last_date":"2026-08-08","next_date":"2026-08-22","parent_sent":"8.08","note":"2주에 한 번 상담","student_status":"재학생"}'::jsonb),
  ('박영규', 1, '남', 'M27', '재학생', 2, true, '{"last_date":"2026-09-03","next_date":"2026-09-17","parent_sent":"9.11","note":"2주에 한 번 상담","student_status":"재학생"}'::jsonb),
  ('나원준', 1, '남', 'M29', '재학생', 2, true, '{"last_date":"2026-09-03","next_date":"2026-09-17","parent_sent":"8.13","note":"2주에 한 번 상담","student_status":"재학생"}'::jsonb),
  ('강태림', 1, '남', 'M33', '재학생', 1, false, '{"last_date":"2028-09-09","next_date":"2028-09-16","parent_sent":null,"note":"","student_status":"재학생"}'::jsonb),
  ('김연호', 1, '남', 'M37', '재학생', 1, true, '{"last_date":"2026-09-09","next_date":"2026-09-16","parent_sent":null,"note":"","student_status":"재학생"}'::jsonb),
  ('한동주', 1, '남', 'M38', '재수생', 1, true, '{"last_date":"2026-09-11","next_date":"2026-09-18","parent_sent":"9.11","note":"","student_status":"재수생"}'::jsonb),
  ('박동힘찬', 1, '남', 'M39', '재수생', 3, true, '{"last_date":"2026-09-09","next_date":"2026-10-07","parent_sent":"8.13","note":"3주에 한 번 상담; 날짜 간격은 4주로 불일치","student_status":"재수생"}'::jsonb),
  ('이수호', 1, '남', 'M40', '재수생', 2, true, '{"last_date":"2026-08-27","next_date":"2026-09-10","parent_sent":"8.27","note":"","student_status":"재수생"}'::jsonb),
  ('조재성', 1, '남', 'M41', '재학생', 3, false, '{"last_date":"2027-09-08","next_date":"2027-09-29","parent_sent":null,"note":"","student_status":"재학생"}'::jsonb),
  ('장원영', 1, '남', 'M42', '재학생', 2, true, '{"last_date":"2026-08-07","next_date":"2026-08-21","parent_sent":"8.07","note":"2주에 한 번 상담","student_status":"재학생"}'::jsonb),
  ('최서우', 1, '남', 'M43', '재학생', 2, true, '{"last_date":"2026-09-10","next_date":"2026-09-24","parent_sent":"9.11","note":"2주에 한 번 상담","student_status":"재학생"}'::jsonb),
  ('박준수', 1, '남', 'M44', '재수생', 1, true, '{"last_date":"2026-09-11","next_date":"2026-09-18","parent_sent":"9.11","note":"","student_status":"재수생"}'::jsonb),
  ('김다인', 2, '여', 'W01', '재수생', 2, true, '{"last_date":"2026-08-25","next_date":"2026-09-08","parent_sent":"8.25","note":"2주에 한 번 상담","student_status":"재수생"}'::jsonb),
  ('문수빈', 2, '여', 'W02', '재학생', 1, true, '{"last_date":"2026-09-02","next_date":"2026-09-09","parent_sent":"8.27","note":"","student_status":"재학생"}'::jsonb),
  ('권효민', 2, '여', 'W03', '자퇴생', 1, true, '{"last_date":"2026-08-31","next_date":"2026-09-07","parent_sent":"8.31","note":"","student_status":"자퇴생"}'::jsonb),
  ('김효경', 2, '여', 'W05', '재학생', 1, true, '{"last_date":null,"next_date":"1900-01-07","parent_sent":null,"note":"","student_status":"재학생"}'::jsonb),
  ('이서진', 2, '여', 'W07', '재수생', 1, true, '{"last_date":"2026-09-10","next_date":"2026-09-17","parent_sent":"9.11","note":"","student_status":"재수생"}'::jsonb),
  ('김찬율', 2, '여', 'W08', '재학생', 1, true, '{"last_date":"2026-09-12","next_date":"2026-09-19","parent_sent":"9.12","note":"","student_status":"재학생"}'::jsonb),
  ('이예나', 2, '여', 'W09', '재수생', 2, true, '{"last_date":"2026-09-12","next_date":"2026-09-26","parent_sent":"9.12","note":"2주에 한 번 상담","student_status":"재수생"}'::jsonb),
  ('노하윤', 2, '여', 'W11', '재학생', 1, true, '{"last_date":"2026-08-20","next_date":"2026-08-27","parent_sent":"8.20.","note":"","student_status":"재학생"}'::jsonb),
  ('신이재', 2, '여', 'W12', '재수생', 1, true, '{"last_date":"2026-08-31","next_date":"2026-09-07","parent_sent":"8.31","note":"","student_status":"재수생"}'::jsonb),
  ('황예진', 2, '여', 'W17', '재수생', 1, true, '{"last_date":"2026-09-10","next_date":"2026-09-17","parent_sent":"9.11","note":"","student_status":"재수생"}'::jsonb),
  ('정예서', 2, '여', 'W18', '재수생', 2, true, '{"last_date":"2026-09-12","next_date":"2026-09-26","parent_sent":"9.12","note":"2주에 한 번 상담","student_status":"재수생"}'::jsonb),
  ('황나연', 2, '여', 'W19', '재학생', 1, true, '{"last_date":"2026-08-26","next_date":"2026-09-02","parent_sent":"8.14","note":"","student_status":"재학생"}'::jsonb),
  ('송지안', 2, '여', 'W20', '재수생', 1, true, '{"last_date":"2026-08-24","next_date":"2026-08-31","parent_sent":"8.24","note":"","student_status":"재수생"}'::jsonb),
  ('이지호', 2, '여', 'W21', '재학생', 1, true, '{"last_date":"2026-08-17","next_date":"2026-08-24","parent_sent":"8.17","note":"","student_status":"재학생"}'::jsonb),
  ('강태이', 2, '여', 'W22', '재수생', 1, true, '{"last_date":"2026-09-02","next_date":"2026-09-09","parent_sent":"8.27","note":"","student_status":"재수생"}'::jsonb),
  ('조민서', 2, '여', 'W24', '재수생', 1, true, '{"last_date":"2026-08-20","next_date":"2026-08-27","parent_sent":"8.20.","note":"","student_status":"재수생"}'::jsonb),
  ('송유진', 2, '여', 'W25', '재학생', 1, true, '{"last_date":"2026-09-10","next_date":"2026-09-17","parent_sent":"9.11","note":"","student_status":"재학생"}'::jsonb),
  ('민다홍', 2, '여', 'W27', '재학생', 1, true, '{"last_date":"2026-08-29","next_date":"2026-09-05","parent_sent":"6.11","note":"","student_status":"재학생"}'::jsonb),
  ('김서우', 2, '여', 'W32', '공시생', 1, false, '{"last_date":"2027-03-02","next_date":"2027-03-09","parent_sent":null,"note":"","student_status":"공시생"}'::jsonb),
  ('구정은', 2, '여', 'W33', '재수생', 2, true, '{"last_date":"2026-08-27","next_date":"2026-09-10","parent_sent":"8.27","note":"2주에 한 번 상담","student_status":"재수생"}'::jsonb),
  ('위선빈', 2, '여', 'W36', '재수생', 2, true, '{"last_date":"2026-09-02","next_date":"2026-09-16","parent_sent":"8.29","note":"2주에 한 번 상담","student_status":"재수생"}'::jsonb),
  ('박연', 2, '여', 'W37', '자퇴생', 1, true, '{"last_date":null,"next_date":"1900-01-07","parent_sent":null,"note":"월요일부터 등원","student_status":"자퇴생"}'::jsonb),
  ('양유림', 2, '여', 'W40', '재학생', 2, true, '{"last_date":"2026-08-22","next_date":"2026-09-05","parent_sent":"8.22.","note":"2주에 한 번 상담","student_status":"재학생"}'::jsonb),
  ('한다영', 2, '여', 'W41', '재수생', 2, true, '{"last_date":"2026-08-20","next_date":"2026-09-03","parent_sent":"8.21","note":"2주에 한 번 상담","student_status":"재수생"}'::jsonb),
  ('이하윤', 2, '여', 'W42', '재학생', 1, true, '{"last_date":"2026-09-05","next_date":"2026-09-12","parent_sent":"9.5","note":"","student_status":"재학생"}'::jsonb),
  ('이혜연', 2, '여', 'W43', '재수생', 2, true, '{"last_date":"2026-09-11","next_date":"2026-09-25","parent_sent":"9.11","note":"2주에 한 번 상담","student_status":"재수생"}'::jsonb),
  ('김다은', 2, '여', 'W44', '자퇴생', 1, true, '{"last_date":"2026-08-31","next_date":"2026-09-07","parent_sent":"8.31","note":"","student_status":"자퇴생"}'::jsonb),
  ('박소율', 2, '여', 'W45', '재학생', 1, true, '{"last_date":"2026-08-26","next_date":"2026-09-02","parent_sent":null,"note":"","student_status":"재학생"}'::jsonb),
  ('김채현', 2, '여', 'W46', '재수생', 2, true, '{"last_date":"2026-08-29","next_date":"2026-09-12","parent_sent":"8.29","note":"2주에 한 번 상담","student_status":"재수생"}'::jsonb)
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
