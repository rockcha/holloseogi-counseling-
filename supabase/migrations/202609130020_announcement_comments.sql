begin;

create table public.announcement_comments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index announcement_comments_post_idx on public.announcement_comments(announcement_id, created_at, id);
alter table public.announcement_comments enable row level security;
revoke all on public.announcement_comments from public, anon, authenticated;
grant select on public.announcement_comments to authenticated;
grant insert (announcement_id, content) on public.announcement_comments to authenticated;
create policy announcement_comments_read on public.announcement_comments for select to authenticated using (
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher)
);
create policy announcement_comments_insert on public.announcement_comments for insert to authenticated with check (
  author_id = (select auth.uid())
  and exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher)
);

create function public.set_announcement_comment_author() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.author_id := auth.uid();
  select name into new.author_name from public.profiles where id = auth.uid() and is_teacher;
  if new.author_name is null then raise exception 'Only approved teachers can comment'; end if;
  new.created_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.set_announcement_comment_author() from public, anon, authenticated;
create trigger announcement_comments_author before insert on public.announcement_comments for each row execute function public.set_announcement_comment_author();

commit;
