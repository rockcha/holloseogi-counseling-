begin;

-- Reinstall confirmation triggers so this also works when 028 was not applied.
-- Existing profile values are never updated or deleted.
create or replace function public.create_member_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is null then
    return new;
  end if;

  insert into public.profiles(id, name, is_teacher)
  values (
    new.id,
    coalesce(nullif(left(btrim(new.raw_user_meta_data->>'name'), 50), ''), '이름 확인 필요'),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_member_profile() from public, anon, authenticated;

drop trigger if exists create_member_profile on auth.users;
create trigger create_member_profile after insert on auth.users
for each row when (new.email_confirmed_at is not null)
execute function public.create_member_profile();

drop trigger if exists create_member_profile_on_email_confirmation on auth.users;
create trigger create_member_profile_on_email_confirmation
after update of email_confirmed_at on auth.users
for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.create_member_profile();

-- Add only missing profiles for already-confirmed users.
insert into public.profiles(id, name, is_teacher)
select
  u.id,
  coalesce(nullif(left(btrim(u.raw_user_meta_data->>'name'), 50), ''), '이름 확인 필요'),
  false
from auth.users u
where u.email_confirmed_at is not null
  and not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

commit;
