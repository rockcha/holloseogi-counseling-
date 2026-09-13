begin;

-- 2관 502호는 영문 관 접두사 없이 502-1 ~ 502-19 좌석번호를 사용합니다.
alter table public.students
  drop constraint if exists students_seat_number_check;
alter table public.students
  add constraint students_seat_number_check
  check (seat_number ~ '^(?:[A-Z]+[0-9]+|502-[0-9]+)$' and char_length(seat_number) <= 20);

commit;