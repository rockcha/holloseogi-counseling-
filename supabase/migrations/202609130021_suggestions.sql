begin;

alter table public.announcements
  add column if not exists category text not null default 'announcement'
  check (category in ('announcement', 'suggestion'));
create index if not exists announcements_category_created_idx on public.announcements(category, created_at desc, id);
grant insert (title, content, building, category) on public.announcements to authenticated;

create or replace function public.record_announcement_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.category = 'suggestion' then return new; end if;
  insert into public.activity_logs(actor_id, actor_name, action, student_id, student_name, building, seat_number, target_type, target_name, changes)
  values (new.author_id, new.author_name, '전달 내용 등록', null, '', new.building, '', 'announcement', new.title,
    jsonb_build_object('audience', jsonb_build_object('before', null, 'after', case when new.building is null then '전체' else new.building::text || '관' end)));
  return new;
end;
$$;

commit;
