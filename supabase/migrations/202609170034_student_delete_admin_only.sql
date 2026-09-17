-- 앱에 연결된 프로젝트에서 실행합니다. 학생 삭제는 is_admin 계정만 가능하도록 제한합니다.
begin;
drop policy if exists students_teacher on public.students;
create policy students_teacher_rw on public.students for select to authenticated
using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true));
create policy students_teacher_write on public.students for insert to authenticated
with check (exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true));
create policy students_teacher_update on public.students for update to authenticated
using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true))
with check (exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true));
create policy students_admin_delete on public.students for delete to authenticated
using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true and is_admin = true));
commit;
