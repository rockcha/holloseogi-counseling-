begin;
create table public.counseling_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  date date not null,
  time time not null,
  note text not null default '' check (char_length(note) <= 1000),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, date, time)
);
create index counseling_plans_date_idx on public.counseling_plans(date, time);
alter table public.counseling_plans enable row level security;
revoke all on public.counseling_plans from anon, authenticated;
grant select, insert on public.counseling_plans to authenticated;
create policy counseling_plans_teacher_read on public.counseling_plans
for select to authenticated using (
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true)
);
create policy counseling_plans_teacher_insert on public.counseling_plans
for insert to authenticated with check (
  created_by = (select auth.uid()) and date >= (now() at time zone 'Asia/Seoul')::date and
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true)
);
commit;
