begin;
drop table if exists public.calendar_events;

create table public.calendar_todos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  todo_date date not null,
  content text not null check (char_length(btrim(content)) between 1 and 300),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index calendar_todos_owner_date on public.calendar_todos(owner_id, todo_date, created_at, id);
alter table public.calendar_todos enable row level security;
revoke all on public.calendar_todos from anon, authenticated;
grant select, insert, update, delete on public.calendar_todos to authenticated;
create policy calendar_todos_owner on public.calendar_todos for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy calendar_todos_teacher on public.calendar_todos as restrictive for all to authenticated
using (exists(select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true))
with check (exists(select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true));

create table public.calendar_daily_memos (
  owner_id uuid not null references auth.users(id) on delete cascade,
  memo_date date not null,
  content text not null default '' check (char_length(content) <= 5000),
  updated_at timestamptz not null default now(),
  primary key (owner_id, memo_date)
);
alter table public.calendar_daily_memos enable row level security;
revoke all on public.calendar_daily_memos from anon, authenticated;
grant select, insert, update, delete on public.calendar_daily_memos to authenticated;
create policy calendar_daily_memos_owner on public.calendar_daily_memos for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy calendar_daily_memos_teacher on public.calendar_daily_memos as restrictive for all to authenticated
using (exists(select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true))
with check (exists(select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true));

create function public.touch_calendar_daily_memo() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.touch_calendar_daily_memo() from public, anon, authenticated;
create trigger calendar_daily_memos_updated_at before update on public.calendar_daily_memos
for each row execute function public.touch_calendar_daily_memo();
commit;
