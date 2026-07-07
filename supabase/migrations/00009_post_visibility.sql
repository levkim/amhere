-- 포스트 공개 범위: 전체 공개(public) / 친구에게만(friends)
-- (비공개는 애초에 포스트를 만들지 않으므로 값이 없다)

alter table posts
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'friends'));

-- 두 사용자가 수락된 버디(친구)인지
create or replace function are_buddies(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from buddy_requests r
    where r.status = 'accepted'
      and ((r.requester_id = a and r.addressee_id = b)
        or (r.addressee_id = a and r.requester_id = b))
  );
$$;

-- RLS: 친구 공개 포스트는 작성자·친구만 열람 (직접 조회 대비 방어)
drop policy if exists "posts readable" on posts;
create policy "posts readable" on posts
  for select to authenticated using (
    expires_at > now()
    and not exists (
      select 1 from blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = author_id)
         or (b.blocker_id = author_id and b.blocked_id = auth.uid())
    )
    and (
      visibility = 'public'
      or author_id = auth.uid()
      or (visibility = 'friends' and are_buddies(auth.uid(), author_id))
    )
  );

-- nearby_posts v3: visibility 필터 + 반환에 visibility 포함 (반환 형태 변경 → 재생성)
drop function if exists nearby_posts(double precision, double precision, int);

create function nearby_posts(lat double precision, lng double precision, radius_m int default 5000)
returns table (
  id uuid, author_id uuid, nickname text, avatar_url text,
  body text, image_url text, tags text[], activity activity_type,
  lat double precision, lng double precision, distance_m double precision,
  created_at timestamptz, expires_at timestamptz,
  helpful_count bigint, i_helped boolean, visibility text
) language sql security definer set search_path = public stable as $$
  select p.id, p.author_id, pr.nickname, pr.avatar_url,
         p.body, p.image_url, p.tags, p.activity,
         st_y(p.location::geometry), st_x(p.location::geometry),
         st_distance(p.location, st_setsrid(st_makepoint(lng, lat), 4326)::geography),
         p.created_at, p.expires_at,
         (select count(*) from post_reactions r where r.post_id = p.id),
         exists (select 1 from post_reactions r where r.post_id = p.id and r.user_id = auth.uid()),
         p.visibility
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
   order by st_distance(p.location, st_setsrid(st_makepoint(lng, lat), 4326)::geography)
   limit 100;
$$;
