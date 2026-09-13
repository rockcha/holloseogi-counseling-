begin;

grant update (date, content, special_notes) on public.counseling_journals to authenticated;
create policy counseling_journals_teacher_update on public.counseling_journals
for update to authenticated using (
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true)
) with check (
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true)
);

commit;
