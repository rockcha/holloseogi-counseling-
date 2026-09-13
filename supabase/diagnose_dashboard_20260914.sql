-- 조회 전용. 테이블/권한/데이터를 변경하지 않습니다.
with expected(relation_name, required_columns) as (values
  ('students', array['id','name','building','gender','seat_number','student_status','phone','counseling_cycle_weeks','counseling_requested','source_sheet']),
  ('profiles', array['id','name','is_teacher']),
  ('student_latest_counsels', array['student_id','latest_date','journal_count']),
  ('my_student_latest_counsels', array['student_id','latest_date','journal_count']),
  ('counseling_plans', array['id','student_id','date','time','note','created_by']),
  ('my_student_latest_parent_messages', array['student_id','last_sent_date']),
  ('counseling_journals', array['id','student_id','date','counselor_id','counselor_name','content','special_notes','parent_message_sent','created_at']),
  ('parent_message_sends', array['student_id','sent_date','recorded_by'])
), inspected as (
  select e.*, to_regclass('public.' || relation_name) as relation_id,
    array(select column_name::text from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = e.relation_name
      order by ordinal_position) as actual_columns
  from expected e
)
select 'DB 구조' as category, relation_name as target,
  case when relation_id is null then '없음'
    when not required_columns <@ actual_columns then '필요한 열 누락'
    else '필요한 열 있음' end as status,
  '현재 열: ' || coalesce(array_to_string(actual_columns, ', '), '') ||
  ' / 누락: ' || coalesce(array_to_string(array(
    select unnest(required_columns) except select unnest(actual_columns)
  ), ', '), '') as detail
from inspected
union all
select '조회 권한', relation_name,
  case when has_table_privilege('authenticated', relation_id, 'SELECT') then 'SELECT 있음' else 'SELECT 없음' end,
  'RLS 정책: ' || coalesce((select string_agg(policyname || ': ' || cmd || ' ' || coalesce(qual, ''), ' | ')
    from pg_policies p where p.schemaname = 'public' and p.tablename = i.relation_name), '없음 또는 뷰')
from inspected i where relation_id is not null
union all
select '미배정 학생', name, '좌석 확인 필요',
  'ID=' || id::text || ' / 성별=' || coalesce(gender, '미입력') ||
  ' / 관=' || coalesce(building::text, '미입력') || ' / 좌석=' || coalesce(seat_number, '미입력')
from public.students
where building is null or seat_number is null or btrim(seat_number) = ''
order by category, target;
