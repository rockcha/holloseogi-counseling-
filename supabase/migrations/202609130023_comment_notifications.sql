begin;

create table if not exists public.announcement_comment_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.announcement_comments(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);
alter table public.announcement_comment_reads enable row level security;
revoke all on public.announcement_comment_reads from public, anon, authenticated;
grant select, insert on public.announcement_comment_reads to authenticated;
drop policy if exists comment_reads_owner_select on public.announcement_comment_reads;
create policy comment_reads_owner_select on public.announcement_comment_reads
for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists comment_reads_owner_insert on public.announcement_comment_reads;
create policy comment_reads_owner_insert on public.announcement_comment_reads
for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.announcement_comments c
    join public.announcements a on a.id = c.announcement_id
    where c.id = comment_id and a.author_id = (select auth.uid())
      and c.author_id <> (select auth.uid()) and a.category = 'announcement'
  )
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'announcement_comments') then
    alter publication supabase_realtime add table public.announcement_comments;
  end if;
end $$;

commit;
