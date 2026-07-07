-- 온보딩 플래그 + 배지 규칙(카운트 기반) + 레벨 자동 상승

-- 1) 온보딩: 신규 가입자만 온보딩. 기존 사용자는 완료 처리.
alter table profiles add column if not exists onboarded boolean not null default false;
update profiles set onboarded = true where onboarded = false;

-- 2) 배지 정의 (없으면 삽입)
insert into badges (code, name, description, icon) values
  ('first_checkin', '첫 발자국', '첫 아웃도어 체크인을 완료했어요', '👣'),
  ('checkin_5',     '주말 워리어', '체크인 5회 달성', '⛰️'),
  ('checkin_20',    '산의 주인', '체크인 20회 달성', '🏔️'),
  ('first_post',    '첫 소식', '첫 포스트를 남겼어요', '📍'),
  ('post_10',       '동네 소식통', '포스트 10개 달성', '📣'),
  ('buddy_5',       '인싸', '버디 5명 달성', '🤝')
on conflict (code) do nothing;

-- 3) 내 배지 갱신 + 레벨 자동 상승 (프로필 열 때 호출)
create or replace function award_badges()
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  n_checkin int;
  n_post int;
  n_buddy int;
  new_level int;
begin
  if uid is null then return; end if;

  select count(*) into n_checkin from check_ins where user_id = uid;
  select count(*) into n_post from posts where author_id = uid;
  select count(*) into n_buddy from buddy_requests
   where status = 'accepted' and (requester_id = uid or addressee_id = uid);

  -- 조건 충족 배지를 부여 (이미 있으면 무시)
  insert into user_badges (user_id, badge_id)
  select uid, b.id from badges b
   where (b.code = 'first_checkin' and n_checkin >= 1)
      or (b.code = 'checkin_5'     and n_checkin >= 5)
      or (b.code = 'checkin_20'    and n_checkin >= 20)
      or (b.code = 'first_post'    and n_post >= 1)
      or (b.code = 'post_10'       and n_post >= 10)
      or (b.code = 'buddy_5'       and n_buddy >= 5)
  on conflict (user_id, badge_id) do nothing;

  -- 레벨: 체크인 10회당 1레벨, 최대 5
  new_level := least(5, 1 + (n_checkin / 10));
  update profiles set level = new_level where id = uid and level <> new_level;
end $$;
