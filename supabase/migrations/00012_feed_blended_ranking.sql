-- 피드 정렬을 거리순 → 혼합 점수(최신성 60% + 근접성 40%)로 변경
-- 반환 컬럼은 v4와 동일하므로 CREATE OR REPLACE (재생성 불필요)

create or replace function nearby_posts(lat double precision, lng double precision, radius_m int default 5000)
returns table (
  id uuid, author_id uuid, nickname text, avatar_url text,
  body text, image_url text, tags text[], activity activity_type,
  lat double precision, lng double precision, distance_m double precision,
  created_at timestamptz, expires_at timestamptz,
  helpful_count bigint, i_helped boolean, visibility text,
  check_in_id uuid, joined_count bigint
) language sql security definer set search_path = public stable as $$
  select p.id, p.author_id, pr.nickname, pr.avatar_url,
         p.body, p.image_url, p.tags, p.activity,
         st_y(p.location::geometry), st_x(p.location::geometry),
         st_distance(p.location, st_setsrid(st_makepoint(lng, lat), 4326)::geography),
         p.created_at, p.expires_at,
         (select count(*) from post_reactions r where r.post_id = p.id),
         exists (select 1 from post_reactions r where r.post_id = p.id and r.user_id = auth.uid()),
         p.visibility,
         p.check_in_id,
         (select count(*) from activity_participants ap
           where ap.check_in_id = p.check_in_id and ap.status = 'accepted')
    from posts p
    join profiles pr on pr.id = p.author_id
   where p.expires_at > now()
     and st_dwithin(p.location, st_setsrid(st_makepoint(lng, lat), 4326)::geography, radius_m)
     and not exists (
       select 1 from blocks b
       where (b.blocker_id = auth.uid() and b.blocked_id = p.author_id)
          or (b.blocker_id = p.author_id and b.blocked_id = auth.uid())
     )
     and (
       p.visibility = 'public'
       or p.author_id = auth.uid()
       or (p.visibility = 'friends' and are_buddies(auth.uid(), p.author_id))
     )
   -- 혼합 점수: 최신성 0.6 + 근접성 0.4 (둘 다 0~1로 정규화), 높은 순
   order by (
     0.6 * (1 - least(extract(epoch from (now() - p.created_at)) / 86400.0, 1))
     + 0.4 * (1 - least(
         st_distance(p.location, st_setsrid(st_makepoint(lng, lat), 4326)::geography) / radius_m,
         1))
   ) desc
   limit 100;
$$;
