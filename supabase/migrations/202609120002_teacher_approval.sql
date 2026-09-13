begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 50),
  is_teacher boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
create policy profiles_read_self on public.profiles for select to authenticated using (id = (select auth.uid()));

-- Approval never comes from user-controlled signup metadata.
create function public.create_member_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, name, is_teacher)
  values (new.id, coalesce(nullif(left(btrim(new.raw_user_meta_data->>'name'), 50), ''), '이름 확인 필요'), false);
  return new;
end;
$$;
revoke all on function public.create_member_profile() from public, anon, authenticated;
create trigger create_member_profile after insert on auth.users
for each row execute function public.create_member_profile();

-- Existing users must also be approved by an administrator.
insert into public.profiles(id, name, is_teacher)
select id, coalesce(nullif(left(btrim(raw_user_meta_data->>'name'), 50), ''), '이름 확인 필요'), false from auth.users;

-- Restrictive policy supplements the existing ownership policies.
create policy counsels_teacher_required on public.counsels as restrictive
for all to authenticated
using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true))
with check (exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true));
commit;
