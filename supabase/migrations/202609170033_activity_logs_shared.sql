-- 앱에 연결된 프로젝트에서 실행합니다. 활동 로그를 모든 선생님이 공유해서 볼 수 있도록 정책을 완화합니다.
begin;
drop policy if exists activity_logs_read on public.activity_logs;
create policy activity_logs_read on public.activity_logs for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.is_teacher
));
commit;
