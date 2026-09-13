begin;

-- Existing rows already store created_by / counselor_id. Preserve ownership.
-- Ownerless rows (e.g. a deleted account) are retained, never reassigned by name.
alter table public.counseling_plans
  drop constraint if exists counseling_plans_student_id_date_time_key;
create unique index if not exists counseling_plans_owner_student_date_time_idx
  on public.counseling_plans (created_by, student_id, date, time);

drop policy if exists counseling_plans_teacher_read on public.counseling_plans;
create policy counseling_plans_teacher_read on public.counseling_plans
for select to authenticated using (
  created_by = (select auth.uid()) and
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true)
);
drop policy if exists counseling_plans_teacher_delete on public.counseling_plans;
create policy counseling_plans_teacher_delete on public.counseling_plans
for delete to authenticated using (
  created_by = (select auth.uid()) and
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true)
);

-- Shared counseling history remains available in student management.
create or replace view public.my_student_latest_counsels with (security_invoker = true) as
select student_id, max(date) as latest_date, count(*) as journal_count
from public.counseling_journals
where counselor_id = (select auth.uid())
group by student_id;
revoke all on public.my_student_latest_counsels from public, anon, authenticated;
grant select on public.my_student_latest_counsels to authenticated;

create index if not exists counseling_journals_owner_student_date_idx
  on public.counseling_journals (counselor_id, student_id, date desc);

create or replace view public.my_student_latest_parent_messages with (security_invoker = true) as
select student_id, max(sent_date) as last_sent_date
from (
  select student_id, sent_date from public.parent_message_sends
  where recorded_by = (select auth.uid())
  union all
  select student_id, date as sent_date from public.counseling_journals
  where counselor_id = (select auth.uid()) and parent_message_sent
) sends
group by student_id;
revoke all on public.my_student_latest_parent_messages from public, anon, authenticated;
grant select on public.my_student_latest_parent_messages to authenticated;

commit;

-- Review legacy rows whose original owner cannot be identified automatically.
select id, student_id, date, created_at
from public.counseling_plans where created_by is null;
select id, student_id, date, counselor_name
from public.counseling_journals where counselor_id is null;
