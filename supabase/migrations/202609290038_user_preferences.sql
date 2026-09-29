begin;

create table public.user_preferences (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  background_theme text not null default 'default'
    check (background_theme in ('default', 'cream', 'peach', 'rose', 'lavender', 'sky', 'mint', 'sage'))
);

alter table public.user_preferences enable row level security;
revoke all on public.user_preferences from anon, authenticated;
grant select, insert, update on public.user_preferences to authenticated;

create policy user_preferences_owner on public.user_preferences
for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy user_preferences_teacher on public.user_preferences
as restrictive for all to authenticated
using (exists(select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true))
with check (exists(select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true));

commit;
