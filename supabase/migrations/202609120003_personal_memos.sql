begin;
create table public.personal_memos (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 5000),
  updated_at timestamptz not null default now()
);
alter table public.personal_memos enable row level security;
revoke all on public.personal_memos from anon, authenticated;
grant select, insert, update on public.personal_memos to authenticated;
create policy personal_memos_owner on public.personal_memos for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy personal_memos_teacher on public.personal_memos as restrictive for all to authenticated
using (exists(select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true))
with check (exists(select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true));
create function public.touch_personal_memo() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.touch_personal_memo() from public, anon, authenticated;
create trigger personal_memos_updated_at before update on public.personal_memos
for each row execute function public.touch_personal_memo();
commit;
