-- 앱에 연결된 프로젝트에서 실행합니다. 학생 데이터 입력 SQL과 독립적입니다.
begin;
alter table public.students
  add column if not exists school text check (char_length(school) <= 100),
  add column if not exists korean_subject text check (char_length(korean_subject) <= 100),
  add column if not exists math_subject text check (char_length(math_subject) <= 100),
  add column if not exists inquiry_subject_1 text check (char_length(inquiry_subject_1) <= 100),
  add column if not exists inquiry_subject_2 text check (char_length(inquiry_subject_2) <= 100),
  add column if not exists special_notes text check (char_length(special_notes) <= 5000);
comment on column public.students.school is '학교 (졸업 여부 등 자유 입력)';
comment on column public.students.korean_subject is '국어 선택과목';
comment on column public.students.math_subject is '수학 선택과목';
comment on column public.students.inquiry_subject_1 is '탐구 선택과목 1';
comment on column public.students.inquiry_subject_2 is '탐구 선택과목 2';
comment on column public.students.special_notes is '학생 특이사항. 상담일지별 특이사항과 별도로 관리';

-- 기존 앱의 활동 로그 함수가 있으면 학생 수정 추적 항목만 확장합니다.
-- 함수가 없는 구형 DB에는 활동 로그 테이블이나 권한을 새로 만들지 않습니다.
do $$
declare
  definition text;
begin
  if to_regprocedure('public.record_activity()') is not null then
    select pg_get_functiondef('public.record_activity()'::regprocedure) into definition;
    if position('''phone'',''counseling_cycle_weeks''' in definition) > 0 then
      execute replace(definition,
        '''phone'',''counseling_cycle_weeks''',
        '''phone'',''school'',''korean_subject'',''math_subject'',''inquiry_subject_1'',''inquiry_subject_2'',''special_notes'',''counseling_cycle_weeks''');
    end if;
  end if;
end;
$$;
notify pgrst, 'reload schema';
commit;
