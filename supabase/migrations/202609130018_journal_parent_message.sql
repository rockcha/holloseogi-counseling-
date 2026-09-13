begin;

alter table public.counseling_journals
  add column if not exists parent_message_sent boolean not null default false;
grant update (parent_message_sent) on public.counseling_journals to authenticated;

-- Journal dates and checked status are saved in the same transaction.
-- Retain older independently recorded message dates from migration 017.
create or replace view public.student_latest_parent_messages with (security_invoker = true) as
select student_id, max(sent_date) as last_sent_date
from (
  select student_id, sent_date from public.parent_message_sends
  union all
  select student_id, date as sent_date from public.counseling_journals where parent_message_sent
) sends
group by student_id;

revoke all on public.student_latest_parent_messages from public, anon, authenticated;
grant select on public.student_latest_parent_messages to authenticated;
commit;
