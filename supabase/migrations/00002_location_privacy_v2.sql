-- Amhere 위치 프라이버시 v2
-- 규칙:
--   * 가입한 모든 사용자는 전 세계에 공개되되, 실제 위치가 아닌 "반경 10km 내 가상 위치"로 표시
--   * 서로 친구(accepted buddy_request)이고 20km 이내면 "반경 500m 내 가상 위치"로 더 정확히 표시
--   * ghost 프라이버시는 지도에서 완전히 제외 (본인 안전장치)
-- 진짜 좌표는 절대 클라이언트로 나가지 않는다 (fuzz_location으로 서버에서 가상화).

-- 실제 위치를 seed(user_id) 기반으로 반경 radius_m 안의 안정적인 가상 위치로 변환한다.
-- 같은 사용자는 항상 같은 가상 위치를 가져 지도에서 튀지 않는다.
create or replace function fuzz_location(loc geography, seed uuid, radius_m double precision)
returns geography language sql immutable as $$
  select st_project(
    loc,
    (abs(hashtextextended(seed::text, 42)) % 1000) / 1000.0 * radius_m,   -- 거리 0~radius
    radians((abs(hashtextextended(seed::text, 7)) % 360)::double precision) -- 방위각 0~360°
  )::geography;
$$;

-- 주변 사용자 (v2). 반환 좌표는 이미 가상화된 값이다.
-- 반환 형태가 v1과 달라 기존 함수를 먼저 제거해야 한다.
drop function if exists nearby_users(double precision, double precision, int);

create function nearby_users(lat double precision, lng double precision, radius_m int default 100000)
returns table (
  user_id uuid, nickname text, avatar_url text, activity activity_type,
  level int, lat double precision, lng double precision,
  is_friend boolean, recorded_at timestamptz
) language sql security definer set search_path = public stable as $$
  with me as (select auth.uid() as uid),
  my_point as (select st_setsrid(st_makepoint(lng, lat), 4326)::geography as g),
  friends as (
    select case when r.requester_id = (select uid from me) then r.addressee_id
                else r.requester_id end as friend_id
    from buddy_requests r
    where r.status = 'accepted'
      and (r.requester_id = (select uid from me) or r.addressee_id = (select uid from me))
  )
  select
    ul.user_id, pr.nickname, pr.avatar_url, ul.activity, pr.level,
    -- 친구 & 20km 이내면 500m 가상 위치, 아니면 10km 가상 위치
    st_y(fuzz_location(
      ul.location, ul.user_id,
      case when ul.user_id in (select friend_id from friends)
                and st_distance(ul.location, (select g from my_point)) <= 20000
           then 500 else 10000 end
    )::geometry),
    st_x(fuzz_location(
      ul.location, ul.user_id,
      case when ul.user_id in (select friend_id from friends)
                and st_distance(ul.location, (select g from my_point)) <= 20000
           then 500 else 10000 end
    )::geometry),
    ul.user_id in (select friend_id from friends)
      and st_distance(ul.location, (select g from my_point)) <= 20000,
    ul.recorded_at
  from user_locations ul
  join profiles pr on pr.id = ul.user_id
  where pr.privacy <> 'ghost'
    and ul.user_id <> (select uid from me)
    and ul.recorded_at > now() - interval '2 hours'
    and st_dwithin(ul.location, (select g from my_point), radius_m)
    and not exists (
      select 1 from blocks b
      where (b.blocker_id = (select uid from me) and b.blocked_id = ul.user_id)
         or (b.blocker_id = ul.user_id and b.blocked_id = (select uid from me))
    )
  limit 500;
$$;
