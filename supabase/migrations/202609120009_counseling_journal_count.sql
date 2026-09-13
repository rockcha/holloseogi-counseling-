begin;
create or replace view public.student_latest_counsels with (security_invoker = true) as
select student_id, max(date) as latest_date, count(*) as journal_count
from public.counseling_journals group by student_id;
revoke all on public.student_latest_counsels from anon, authenticated;
grant select on public.student_latest_counsels to authenticated;
commit;
