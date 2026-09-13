-- 202609140026_502_room_seats.sql 적용 후 실행합니다.
-- 2관 502호 좌석표의 이름이 있는 8명만 등록합니다. 빈 좌석 502-3 등은 미등록 상태로 둡니다.
-- 같은 관/좌석이 이미 있으면 기존 정보를 보존합니다.
begin;
insert into public.students (
  name, building, gender, seat_number, student_status,
  counseling_cycle_weeks, counseling_requested
)
values
  ('김강현', 2, '남', '502-1', 'N수생', 1, true),
  ('안현준', 2, '남', '502-2', '재수생', 1, true),
  ('음효진', 2, '여', '502-5', '재수생', 2, true),
  ('손채빈', 2, '여', '502-10', '재학생', 1, true),
  ('김재호', 2, '남', '502-14', 'N수생', 1, false),
  ('김민지', 2, '여', '502-15', '자퇴생', 1, true),
  ('최희진', 2, '여', '502-16', '재학생', 1, true),
  ('이하나', 2, '여', '502-17', '재학생', 1, true)
on conflict (building, seat_number) do nothing;
commit;