begin;
create table public.counseling_journals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  date date not null default ((now() at time zone 'Asia/Seoul')::date)
    check (date <= (now() at time zone 'Asia/Seoul')::date),
  counselor_id uuid default auth.uid() references auth.users(id) on delete set null,
  counselor_name text not null check (char_length(btrim(counselor_name)) between 1 and 50),
  content text not null check (char_length(btrim(content)) between 1 and 10000),
  special_notes text not null default '' check (char_length(special_notes) <= 5000),
  created_at timestamptz not null default now()
);
create index counseling_journals_student_date_idx on public.counseling_journals(student_id, date desc, created_at desc);

-- Author information comes from the signed-in, approved teacher, not form input.
create function public.set_journal_counselor() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.counselor_id = auth.uid();
  select p.name into new.counselor_name from public.profiles p
    where p.id = auth.uid() and p.is_teacher = true;
  if new.counselor_name is null then
    raise exception 'Only approved teachers can write counseling journals';
  end if;
  return new;
end;
$$;
revoke all on function public.set_journal_counselor() from public, anon, authenticated;
create trigger counseling_journals_author before insert on public.counseling_journals
for each row execute function public.set_journal_counselor();

alter table public.counseling_journals enable row level security;
revoke all on public.counseling_journals from anon, authenticated;
grant select, insert on public.counseling_journals to authenticated;
create policy counseling_journals_teacher_read on public.counseling_journals
for select to authenticated using (
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true)
);
create policy counseling_journals_teacher_insert on public.counseling_journals
for insert to authenticated with check (
  counselor_id = (select auth.uid()) and
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true)
);

-- Uses the caller's permissions and the journal table's RLS policies.
create view public.student_latest_counsels with (security_invoker = true) as
select student_id, max(date) as latest_date from public.counseling_journals group by student_id;
revoke all on public.student_latest_counsels from anon, authenticated;
grant select on public.student_latest_counsels to authenticated;
commit;
