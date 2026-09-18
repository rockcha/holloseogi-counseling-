-- 앱에 연결된 프로젝트에서 실행합니다. 모든 승인된 선생님이 함께 보고 쓰는 공유 메모(전달 내용) 테이블입니다.
begin;
create table public.shared_memos (
  id text primary key,
  content text not null default '' check (char_length(content) <= 5000),
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.shared_memos (id) values ('default');
alter table public.shared_memos enable row level security;
revoke all on public.shared_memos from anon, authenticated;
grant select, update on public.shared_memos to authenticated;
create policy shared_memos_teacher_select on public.shared_memos for select to authenticated
using (exists(select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true));
create policy shared_memos_teacher_update on public.shared_memos for update to authenticated
using (exists(select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true))
with check (exists(select 1 from public.profiles where id = (select auth.uid()) and is_teacher = true));
create function public.touch_shared_memo() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;
revoke all on function public.touch_shared_memo() from public, anon, authenticated;
create trigger shared_memos_updated_at before update on public.shared_memos
for each row execute function public.touch_shared_memo();
commit;
