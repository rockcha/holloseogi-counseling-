begin;
alter table public.students
  add column student_status text
  constraint students_student_status_check check (student_status in ('현역', '재수생'));
comment on column public.students.student_status is '현역 / 재수생. 미지정은 NULL';
commit;
