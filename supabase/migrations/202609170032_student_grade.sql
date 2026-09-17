-- 앱에 연결된 프로젝트에서 실행합니다. 학년(예비고1/고1/고2/고3/n수) 정보를 별도 컬럼으로 관리합니다.
begin;
alter table public.students drop constraint if exists students_grade_check;
alter table public.students
  add column if not exists grade text
  constraint students_grade_check check (grade in ('예비고1', '고1', '고2', '고3', 'n수'));
comment on column public.students.grade is '학년: 예비고1 / 고1 / 고2 / 고3 / n수. 미지정은 NULL';

-- 기존 앱의 활동 로그 함수가 있으면 학생 수정 추적 항목에 grade를 포함합니다.
-- 함수가 없는 구형 DB에는 활동 로그 테이블이나 권한을 새로 만들지 않습니다.
do $$
declare
  definition text;
begin
  if to_regprocedure('public.record_activity()') is not null then
    select pg_get_functiondef('public.record_activity()'::regprocedure) into definition;
    if position('''special_notes''' in definition) > 0
       and position('''grade''' in definition) = 0 then
      execute replace(definition, '''special_notes''', '''special_notes'',''grade''');
    end if;
  end if;
end;
$$;
notify pgrst, 'reload schema';
commit;
