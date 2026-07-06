-- 기능 고도화: 활동 종목 추가(MTB/싸이클), 체크인 위치명, 포스트 "도움됐어요" 반응

-- 1) 활동 종목 추가 (라벨 변경은 클라이언트에서: 스키장/프리라이딩/백컨트리 스키·보딩)
alter type activity_type add value if not exists 'mtb';
alter type activity_type add value if not exists 'cycling';

-- 2) 체크인에 "어디에서 하시나요?" 위치명 저장
alter table check_ins add column if not exists location_name text;

-- 3) 포스트 "도움됐어요" 반응
create table if not exists post_reactions (
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table post_reactions enable row level security;

drop policy if exists "reactions readable" on post_reactions;
create policy "reactions readable" on post_reactions
  for select to authenticated using (true);

drop policy if exists "reactions self insert" on post_reactions;
create policy "reactions self insert" on post_reactions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "reactions self delete" on post_reactions;
create policy "reactions self delete" on post_reactions
  for delete to authenticated using (user_id = auth.uid());

-- 4) nearby_posts v2: 도움됐어요 수 + 내가 눌렀는지 포함 (반환 형태 변경 → 재생성)
drop function if exists nearby_posts(double precision, double precision, int);

create function nearby_posts(lat double precision, lng double precision, radius_m int default 5000)
returns table (
  id uuid, author_id uuid, nickname text, avatar_url text,
  body text, image_url text, tags text[], activity activity_type,
  lat double precision, lng double precision, distance_m double precision,
  created_at timestamptz, expires_at timestamptz,
  helpful_count bigint, i_helped boolean
) language sql security definer set search_path = public stable as $$
  select p.id, p.author_id, pr.nickname, pr.avatar_url,
         p.body, p.image_url, p.tags, p.activity,
         st_y(p.location::geometry), st_x(p.location::geometry),
         st_distance(p.location, st_setsrid(st_makepoint(lng, lat), 4326)::geography),
         p.created_at, p.expires_at,
         (select count(*) from post_reactions r where r.post_id = p.id),
         exists (select 1 from post_reactions r where r.post_id = p.id and r.user_id = auth.uid())
    from posts p
    join profiles pr on pr.id = p.author_id
   where p.expires_at > now()
     and st_dwithin(p.location, st_setsrid(st_makepoint(lng, lat), 4326)::geography, radius_m)
     and not exists (
       select 1 from blocks b
       where (b.blocker_id = auth.uid() and b.blocked_id = p.author_id)
          or (b.blocker_id = p.author_id and b.blocked_id = auth.uid())
     )
   order by st_distance(p.location, st_setsrid(st_makepoint(lng, lat), 4326)::geography)
   limit 100;
$$;
