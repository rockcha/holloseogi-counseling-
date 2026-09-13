begin;

-- This flag can only be assigned by the project administrator, never signup metadata.
alter table public.profiles add column is_admin boolean not null default false;

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default clock_timestamp(),
  actor_id uuid,
  actor_name text not null,
  action text not null,
  student_id uuid not null,
  student_name text not null,
  building integer,
  seat_number text not null default '',
  changes jsonb not null default '{}'::jsonb
);
-- Deliberately no foreign keys: deleting students, journals or accounts preserves history.
create index activity_logs_time_idx on public.activity_logs(occurred_at desc, id desc);
create index activity_logs_actor_time_idx on public.activity_logs(actor_id, occurred_at desc);
create index activity_logs_student_idx on public.activity_logs(student_id, occurred_at desc);
alter table public.activity_logs enable row level security;
revoke all on public.activity_logs from public, anon, authenticated;
grant select on public.activity_logs to authenticated;
create policy activity_logs_read on public.activity_logs for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.is_teacher
    and (p.is_admin or activity_logs.actor_id = p.id)
));

create function public.record_activity() returns trigger
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
  if tg_op <> 'INSERT' then previous := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then current_row := to_jsonb(new); end if;
  snapshot := case when tg_op = 'DELETE' then previous else current_row end;
  select name into actor_label from public.profiles where id = actor;
  actor_label := coalesce(actor_label, '시스템 / DB 관리자');

  if tg_table_name = 'students' then
    target := (snapshot->>'id')::uuid;
    student_snapshot := snapshot;
    action_label := case tg_op when 'INSERT' then '학생 추가' when 'UPDATE' then '학생 정보 수정' else '학생 삭제' end;
    if tg_op = 'UPDATE' then
      foreach field in array array['name','building','seat_number','gender','student_status','phone','counseling_cycle_weeks'] loop
        if previous->field is distinct from current_row->field then
          differences := differences || jsonb_build_object(field, jsonb_build_object('before', previous->field, 'after', current_row->field));
        end if;
      end loop;
      if differences = '{}'::jsonb then return new; end if;
    end if;
  else
    target := (snapshot->>'student_id')::uuid;
    select to_jsonb(s) into student_snapshot from public.students s where s.id = target;
    -- Student BEFORE DELETE audit has the snapshot even during cascading journal deletion.
    if student_snapshot is null then
      select jsonb_build_object('name', l.student_name, 'building', l.building, 'seat_number', l.seat_number)
      into student_snapshot from public.activity_logs l where l.student_id = target order by l.occurred_at desc, l.id desc limit 1;
    end if;
    if tg_table_name = 'counseling_journals' then
      action_label := case tg_op when 'INSERT' then '상담 완료' when 'UPDATE' then '상담일지 수정' else '상담일지 삭제' end;
      if tg_op = 'UPDATE' then
        foreach field in array array['date','content','special_notes'] loop
          if previous->field is distinct from current_row->field then
            -- Keep private counseling text out of the activity listing.
            differences := differences || jsonb_build_object(field, jsonb_build_object(
              'before', case when field = 'date' then previous->>field else '이전 내용' end,
              'after', case when field = 'date' then current_row->>field else '수정됨' end));
          end if;
        end loop;
        if differences = '{}'::jsonb then return new; end if;
      else
        differences := jsonb_build_object('date', jsonb_build_object('before', case when tg_op = 'DELETE' then snapshot->>'date' end, 'after', case when tg_op = 'INSERT' then snapshot->>'date' end));
      end if;
    else
      action_label := '상담할 학생 추가';
    end if;
  end if;

  insert into public.activity_logs(actor_id, actor_name, action, student_id, student_name, building, seat_number, changes)
  values (actor, actor_label, action_label, target, coalesce(student_snapshot->>'name', '삭제된 학생'),
    (student_snapshot->>'building')::integer, coalesce(student_snapshot->>'seat_number', ''), differences);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.record_activity() from public, anon, authenticated;

create trigger students_activity_write after insert or update on public.students
for each row execute function public.record_activity();
create trigger students_activity_delete before delete on public.students
for each row execute function public.record_activity();
create trigger journals_activity after insert or update or delete on public.counseling_journals
for each row execute function public.record_activity();
create trigger plans_activity after insert on public.counseling_plans
for each row execute function public.record_activity();

grant delete on public.counseling_journals to authenticated;
create policy counseling_journals_teacher_delete on public.counseling_journals
for delete to authenticated using (
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true)
);

commit;
