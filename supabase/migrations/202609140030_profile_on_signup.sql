begin;

-- Email confirmation is disabled separately in Auth provider settings.
-- Preserve every existing profile, including teacher/admin approvals.
create or replace function public.create_member_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, name, is_teacher)
  values (new.id, coalesce(nullif(left(btrim(new.raw_user_meta_data->>'name'), 50), ''), '이름 확인 필요'), false)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_member_profile() from public, anon, authenticated;

drop trigger if exists create_member_profile_on_email_confirmation on auth.users;
drop trigger if exists create_member_profile on auth.users;
create trigger create_member_profile after insert on auth.users
for each row execute function public.create_member_profile();

insert into public.profiles(id, name, is_teacher)
select u.id, coalesce(nullif(left(btrim(u.raw_user_meta_data->>'name'), 50), ''), '이름 확인 필요'), false
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

commit;
