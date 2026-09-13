begin;
create table public.parent_message_sends (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  sent_date date not null check (sent_date <= (now() at time zone 'Asia/Seoul')::date),
  recorded_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, sent_date)
);
comment on table public.parent_message_sends is '부모님 문자 전송 날짜 기록';
alter table public.parent_message_sends enable row level security;
revoke all on public.parent_message_sends from public, anon, authenticated;
grant select on public.parent_message_sends to authenticated;
grant insert (student_id, sent_date) on public.parent_message_sends to authenticated;
create policy parent_message_sends_read on public.parent_message_sends
for select to authenticated using (
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher)
);
create policy parent_message_sends_insert on public.parent_message_sends
for insert to authenticated with check (
  recorded_by = (select auth.uid()) and
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher)
);
create view public.student_latest_parent_messages with (security_invoker = true) as
select student_id, max(sent_date) as last_sent_date from public.parent_message_sends group by student_id;
revoke all on public.student_latest_parent_messages from public, anon, authenticated;
grant select on public.student_latest_parent_messages to authenticated;
commit;
