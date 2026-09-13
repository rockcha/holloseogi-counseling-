begin;

grant delete on public.counseling_plans to authenticated;
drop policy if exists counseling_plans_teacher_delete on public.counseling_plans;
create policy counseling_plans_teacher_delete on public.counseling_plans
for delete to authenticated using (
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true)
);

commit;
