begin;

-- Keep shared reads, but allow only the approved author to change a journal.
revoke update on public.counseling_journals from authenticated;
grant update (date, content, special_notes) on public.counseling_journals to authenticated;
grant delete on public.counseling_journals to authenticated;

drop policy if exists counseling_journals_teacher_update on public.counseling_journals;
drop policy if exists counseling_journals_owner_update on public.counseling_journals;
create policy counseling_journals_owner_update on public.counseling_journals
for update to authenticated
using (
  counselor_id = (select auth.uid()) and
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true)
)
with check (
  counselor_id = (select auth.uid()) and
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true)
);

drop policy if exists counseling_journals_teacher_delete on public.counseling_journals;
drop policy if exists counseling_journals_owner_delete on public.counseling_journals;
create policy counseling_journals_owner_delete on public.counseling_journals
for delete to authenticated using (
  counselor_id = (select auth.uid()) and
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true)
);

commit;
