begin;
alter table public.students drop constraint if exists students_counseling_cycle_weeks_check;
alter table public.students add constraint students_counseling_cycle_weeks_check
  check (counseling_cycle_weeks between 0 and 52);
comment on column public.students.counseling_cycle_weeks is '0: 상담 없음, 1~52: 주 단위 상담주기. 기본값 1주';
commit;
