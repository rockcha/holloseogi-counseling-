-- Run once in Supabase SQL Editor. Records are private to their authenticated owner.
create table public.counsels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  grade text not null,
  type text not null check (type in ('학습 상담', '학부모 상담', '신규 상담')),
  date date not null,
  time time not null,
  status text not null default '예정' check (status in ('예정', '완료', '대기')),
  memo text not null default '' check (char_length(memo) <= 3000),
  created_at timestamptz not null default now()
);
create index counsels_owner_date_idx on public.counsels(owner_id, date desc);
alter table public.counsels enable row level security;
revoke all on public.counsels from anon, authenticated;
grant select, insert, update on public.counsels to authenticated;
create policy counsels_select_own on public.counsels for select to authenticated using ((select auth.uid()) = owner_id);
create policy counsels_insert_own on public.counsels for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy counsels_update_own on public.counsels for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
