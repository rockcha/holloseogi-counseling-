-- Activity logs are visible only to accounts with is_admin = true.
begin;

drop policy if exists activity_logs_read on public.activity_logs;
create policy activity_logs_read on public.activity_logs
for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.is_admin = true
));

commit;
