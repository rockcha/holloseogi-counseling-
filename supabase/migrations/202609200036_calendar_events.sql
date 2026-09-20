begin;
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null,
  type text not null check (type in ('work', 'schedule', 'etc', 'hobby')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  memo text,
  created_at timestamptz not null default now()
);
create index calendar_events_owner_date on public.calendar_events(owner_id, event_date, id);
alter table public.calendar_events enable row level security;
revoke all on public.calendar_events from anon, authenticated;
grant select, insert, update, delete on public.calendar_events to authenticated;
create policy calendar_events_owner on public.calendar_events for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy calendar_events_teacher on public.calendar_events as restrictive for all to authenticated
using (exists(select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true))
with check (exists(select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true));
commit;
