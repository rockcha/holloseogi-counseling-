begin;
-- 005 실행 후 적용. 자동 생성된 제약 이름과 명시적 제약 이름 모두 대응합니다.
alter table public.students drop constraint if exists students_student_status_check;
update public.students set student_status = '재학생' where student_status = '현역';
alter table public.students add constraint students_student_status_check
  check (student_status in ('재학생', '재수생'));
comment on column public.students.student_status is '재학생 / 재수생. 미지정은 NULL';
commit;
