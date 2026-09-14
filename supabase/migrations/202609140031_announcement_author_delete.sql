begin;
grant delete on public.announcements to authenticated;
drop policy if exists announcements_delete_own on public.announcements;
create policy announcements_delete_own on public.announcements
for delete to authenticated using (
  category = 'announcement'
  and author_id = (select auth.uid())
  and exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true)
);
commit;
