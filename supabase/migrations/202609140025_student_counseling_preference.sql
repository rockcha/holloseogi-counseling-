begin;
-- 구버전 학생 테이블에도 필요한 열을 먼저 추가합니다. 기존 값은 보존합니다.
-- 기존 학생의 관/좌석을 추정하지 않으므로 미배정 값은 NULL로 유지합니다.
alter table public.students add column if not exists building smallint;
alter table public.students add column if not exists seat_number text;
create unique index if not exists students_import_building_seat_unique
  on public.students (building, seat_number);
alter table public.students add column if not exists counseling_cycle_weeks smallint not null default 1;
alter table public.students add column if not exists student_status text;
alter table public.students add column if not exists gender text;
alter table public.students add column if not exists phone text;
alter table public.students add column if not exists counseling_requested boolean not null default true;
alter table public.students add column if not exists source_sheet jsonb;
update public.students set counseling_requested = false where counseling_cycle_weeks = 0;
alter table public.students drop constraint if exists students_student_status_check;
update public.students set student_status = '재학생' where student_status = '현역';
alter table public.students add constraint students_student_status_check
  check (student_status in ('재학생', '재수생', 'N수생', '자퇴생', '공시생'));
comment on column public.students.counseling_requested is '상담 희망 여부. false이면 정기 상담 필요 목록에서 제외';
comment on column public.students.source_sheet is '사용자 첨부 표 원문. 미확인 날짜는 실제 상담/전송 실적이 아님';
create or replace function public.record_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  previous jsonb := '{}'::jsonb;
  current_row jsonb := '{}'::jsonb;
  snapshot jsonb;
  student_snapshot jsonb;
  target uuid;
  actor uuid := auth.uid();
  actor_label text;
  action_label text;
  field text;
  differences jsonb := '{}'::jsonb;
begin
  if tg_table_name = 'counseling_plans' then
    return new;
  end if;

  if tg_op <> 'INSERT' then previous := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then current_row := to_jsonb(new); end if;
  snapshot := case when tg_op = 'DELETE' then previous else current_row end;
  select name into actor_label from public.profiles where id = actor;
  actor_label := coalesce(actor_label, '시스템 / DB 관리자');

  if tg_table_name = 'students' then
    target := (snapshot->>'id')::uuid;
    student_snapshot := snapshot;
    action_label := case tg_op when 'INSERT' then '학생 추가' when 'UPDATE' then '학생 수정' else '학생 삭제' end;
    if tg_op = 'UPDATE' then
      foreach field in array array['name','building','seat_number','gender','student_status','phone','counseling_cycle_weeks','counseling_requested'] loop
        if previous->field is distinct from current_row->field then
          differences := differences || jsonb_build_object(field, jsonb_build_object('before', previous->field, 'after', current_row->field));
        end if;
      end loop;
      if differences = '{}'::jsonb then return new; end if;
    end if;
  else
    if tg_op = 'UPDATE' then
      return new;
    end if;
    target := (snapshot->>'student_id')::uuid;
    select to_jsonb(s) into student_snapshot from public.students s where s.id = target;
    if student_snapshot is null then
      select jsonb_build_object('name', l.student_name, 'building', l.building, 'seat_number', l.seat_number)
      into student_snapshot from public.activity_logs l where l.student_id = target order by l.occurred_at desc, l.id desc limit 1;
    end if;
    action_label := case tg_op when 'INSERT' then '상담 완료' else '상담 삭제' end;
    differences := jsonb_build_object('date', jsonb_build_object(
      'before', case when tg_op = 'DELETE' then snapshot->>'date' end,
      'after', case when tg_op = 'INSERT' then snapshot->>'date' end));
  end if;

  insert into public.activity_logs(actor_id, actor_name, action, student_id, student_name, building, seat_number, changes)
  values (actor, actor_label, action_label, target, coalesce(student_snapshot->>'name', '삭제된 학생'),
    (student_snapshot->>'building')::integer, coalesce(student_snapshot->>'seat_number', ''), differences);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;


commit;
