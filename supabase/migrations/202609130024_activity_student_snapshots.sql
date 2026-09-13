begin;

-- Stop recording planned-student additions, including installations with the old trigger.
drop trigger if exists plans_activity on public.counseling_plans;

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
      foreach field in array array['name','building','seat_number','gender','student_status','phone','counseling_cycle_weeks'] loop
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
