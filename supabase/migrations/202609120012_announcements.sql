begin;

alter table public.activity_logs alter column student_id drop not null;
alter table public.activity_logs add column target_type text not null default 'student';
alter table public.activity_logs add column target_name text not null default '';
alter table public.activity_logs add column target_label text generated always as (coalesce(nullif(target_name, ''), student_name)) stored;

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  content text not null check (char_length(btrim(content)) between 1 and 10000),
  building integer check (building in (1, 2)),
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  created_at timestamptz not null default now()
);
create index announcements_created_idx on public.announcements(created_at desc, id);
alter table public.announcements enable row level security;
revoke all on public.announcements from public, anon, authenticated;
grant select on public.announcements to authenticated;
grant insert (title, content, building) on public.announcements to authenticated;
create policy announcements_read on public.announcements for select to authenticated using (
  exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher)
);
create policy announcements_insert on public.announcements for insert to authenticated with check (
  author_id = (select auth.uid()) and exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher)
);

create function public.set_announcement_author() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.author_id := auth.uid();
  select name into new.author_name from public.profiles where id = auth.uid() and is_teacher;
  if new.author_name is null then raise exception 'Only approved teachers can post announcements'; end if;
  new.created_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.set_announcement_author() from public, anon, authenticated;
create trigger announcements_author before insert on public.announcements for each row execute function public.set_announcement_author();

create function public.record_announcement_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.activity_logs(actor_id, actor_name, action, student_id, student_name, building, seat_number, target_type, target_name, changes)
  values (new.author_id, new.author_name, '전달 내용 등록', null, '', new.building, '', 'announcement', new.title,
    jsonb_build_object('audience', jsonb_build_object('before', null, 'after', case when new.building is null then '전체' else new.building::text || '관' end)));
  return new;
end;
$$;
revoke all on function public.record_announcement_activity() from public, anon, authenticated;
create trigger announcements_activity after insert on public.announcements for each row execute function public.record_announcement_activity();

create table public.announcement_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);
alter table public.announcement_reads enable row level security;
revoke all on public.announcement_reads from public, anon, authenticated;
grant select on public.announcement_reads to authenticated;
grant insert (user_id, announcement_id) on public.announcement_reads to authenticated;
create policy announcement_reads_select on public.announcement_reads for select to authenticated using (
  user_id = (select auth.uid()) and exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher)
);
create policy announcement_reads_insert on public.announcement_reads for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (select 1 from public.profiles where id = (select auth.uid()) and is_teacher)
);
commit;
