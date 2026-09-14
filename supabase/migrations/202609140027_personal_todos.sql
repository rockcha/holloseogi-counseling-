begin;
create table public.personal_todos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
create index personal_todos_owner_created on public.personal_todos(owner_id, created_at, id);
alter table public.personal_todos enable row level security;
revoke all on public.personal_todos from anon, authenticated;
grant select, insert, update, delete on public.personal_todos to authenticated;
create policy personal_todos_owner on public.personal_todos for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy personal_todos_teacher on public.personal_todos as restrictive for all to authenticated
using (exists(select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true))
with check (exists(select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true));
commit;
