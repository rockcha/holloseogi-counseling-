begin;
create table public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 50),
  building smallint not null check (building in (1, 2)),
  gender text check (gender in ('남', '여')),
  seat_number text not null check (seat_number ~ '^[A-Z]+[0-9]+$' and char_length(seat_number) <= 20),
  phone text check (char_length(phone) <= 30),
  counseling_cycle_weeks smallint not null default 1 check (counseling_cycle_weeks between 1 and 52),
  created_at timestamptz not null default now(),
  unique (building, seat_number)
);
alter table public.students enable row level security;
revoke all on public.students from anon, authenticated;
grant select, insert, update, delete on public.students to authenticated;
-- Student records are shared among approved teachers.
create policy students_teacher on public.students for all to authenticated
using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true))
with check (exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true));
commit;
