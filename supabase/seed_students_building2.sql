-- Run after migrations/202609120004_students.sql in the Supabase SQL Editor.
-- 503호 좌석표: 이름이 있는 28명만 등록합니다. 모두 2관, 상담주기 1주.
-- 성별과 전화번호는 자료에 없으므로 NULL입니다. ●는 재학생 표시이며 성별이 아닙니다.
-- 좌석이 없는 상단의 최진환 표기는 포함하지 않았습니다.
-- 같은 관/좌석이 이미 있으면 기존 정보를 보존합니다.
begin;
insert into public.students (name, building, gender, seat_number, phone, counseling_cycle_weeks)
values
  ('김다인', 2, null, 'W01', null, 1),
  ('문수빈', 2, null, 'W02', null, 1),
  ('권효민', 2, null, 'W03', null, 1),
  ('김효경', 2, null, 'W05', null, 1),
  ('이서진', 2, null, 'W07', null, 1),
  ('김찬율', 2, null, 'W08', null, 1),
  ('이예나', 2, null, 'W09', null, 1),
  ('노하윤', 2, null, 'W11', null, 1),
  ('신이재', 2, null, 'W12', null, 1),
  ('황예진', 2, null, 'W17', null, 1),
  ('정예서', 2, null, 'W18', null, 1),
  ('황나연', 2, null, 'W19', null, 1),
  ('송지안', 2, null, 'W20', null, 1),
  ('이지호', 2, null, 'W21', null, 1),
  ('강태이', 2, null, 'W22', null, 1),
  ('조민서', 2, null, 'W24', null, 1),
  ('송유진', 2, null, 'W25', null, 1),
  ('민다홍', 2, null, 'W27', null, 1),
  ('김서우', 2, null, 'W32', null, 1),
  ('구정은', 2, null, 'W33', null, 1),
  ('위선빈', 2, null, 'W36', null, 1),
  ('양유림', 2, null, 'W40', null, 1),
  ('한다영', 2, null, 'W41', null, 1),
  ('이하윤', 2, null, 'W42', null, 1),
  ('이혜연', 2, null, 'W43', null, 1),
  ('김다은', 2, null, 'W44', null, 1),
  ('박소율', 2, null, 'W45', null, 1),
  ('김채현', 2, null, 'W46', null, 1)
on conflict (building, seat_number) do nothing;
commit;
