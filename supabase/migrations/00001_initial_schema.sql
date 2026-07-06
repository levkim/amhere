-- Amhere initial schema
-- PostGIS 기반 위치 쿼리 + RLS 보안 모델
-- 위치 원본(user_locations)은 직접 SELECT 불가 — 프라이버시 필터를 거친 RPC로만 조회

create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type activity_type as enum
  ('ski', 'snowboard', 'backcountry', 'hiking', 'trekking', 'running');

create type location_privacy as enum ('precise', 'approximate', 'ghost');

create type buddy_status as enum ('pending', 'accepted', 'declined', 'cancelled');

create type checkin_status as enum ('active', 'completed', 'overdue', 'alerted');

-- ---------------------------------------------------------------------------
-- Profiles (auth.users 1:1)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null unique check (char_length(nickname) between 2 and 20),
  avatar_url text,
  activities activity_type[] not null default '{}',
  level int not null default 1 check (level between 1 and 5),
  privacy location_privacy not null default 'approximate',
  bio text check (char_length(bio) <= 200),
  created_at timestamptz not null default now()
);

-- 회원가입 시 프로필 자동 생성
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nickname)
  values (new.id, 'user_' || substr(new.id::text, 1, 8));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- 실시간 위치 (사용자당 1행, upsert 전용)
-- ---------------------------------------------------------------------------
create table user_locations (
  user_id uuid primary key references profiles (id) on delete cascade,
  location geography(point, 4326) not null,
  accuracy_m real,
  activity activity_type,
  recorded_at timestamptz not null default now()
);

create index user_locations_gix on user_locations using gist (location);

-- ---------------------------------------------------------------------------
-- 피드 포스트 (24시간 만료)
-- ---------------------------------------------------------------------------
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  location geography(point, 4326) not null,
  body text not null check (char_length(body) between 1 and 200),
  image_url text,
  tags text[] not null default '{}',
  activity activity_type,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create index posts_gix on posts using gist (location);
create index posts_expires_idx on posts (expires_at);

-- ---------------------------------------------------------------------------
-- 버디 매칭 + 채팅
-- ---------------------------------------------------------------------------
create table buddy_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles (id) on delete cascade,
  addressee_id uuid not null references profiles (id) on delete cascade,
  activity activity_type not null,
  planned_date date not null,
  region text not null,
  message text check (char_length(message) <= 300),
  status buddy_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

create index buddy_requests_addressee_idx on buddy_requests (addressee_id, status);

create table messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references buddy_requests (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index messages_request_idx on messages (request_id, created_at);

-- ---------------------------------------------------------------------------
-- 안전 체크인
-- ---------------------------------------------------------------------------
create table emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  phone text not null,
  relation text,
  created_at timestamptz not null default now()
);

create table check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  activity activity_type not null,
  contact_id uuid references emergency_contacts (id) on delete set null,
  started_at timestamptz not null default now(),
  expected_end_at timestamptz not null,
  completed_at timestamptz,
  status checkin_status not null default 'active',
  last_location geography(point, 4326),
  last_location_at timestamptz,
  check (expected_end_at > started_at)
);

-- 안전 판정은 서버 기준: Edge Function(safety-sweep)이 주기적으로 스캔
create index check_ins_active_idx on check_ins (expected_end_at) where status = 'active';

-- ---------------------------------------------------------------------------
-- 게이미피케이션 / 신고·차단
-- ---------------------------------------------------------------------------
create table badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  icon text
);

create table user_badges (
  user_id uuid not null references profiles (id) on delete cascade,
  badge_id uuid not null references badges (id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table blocks (
  blocker_id uuid not null references profiles (id) on delete cascade,
  blocked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  target_user_id uuid references profiles (id) on delete cascade,
  target_post_id uuid references posts (id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  check (target_user_id is not null or target_post_id is not null)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table user_locations enable row level security;
alter table posts enable row level security;
alter table buddy_requests enable row level security;
alter table messages enable row level security;
alter table emergency_contacts enable row level security;
alter table check_ins enable row level security;
alter table badges enable row level security;
alter table user_badges enable row level security;
alter table blocks enable row level security;
alter table reports enable row level security;

-- profiles: 로그인 사용자는 열람 가능, 본인만 수정
create policy "profiles readable" on profiles
  for select to authenticated using (true);
create policy "profiles self update" on profiles
  for update to authenticated using (id = auth.uid());

-- user_locations: 직접 조회 금지(정책 없음) — nearby_users RPC로만 접근. 쓰기는 본인만
create policy "locations self upsert" on user_locations
  for insert to authenticated with check (user_id = auth.uid());
create policy "locations self update" on user_locations
  for update to authenticated using (user_id = auth.uid());
create policy "locations self delete" on user_locations
  for delete to authenticated using (user_id = auth.uid());

-- posts: 만료 전 + 차단 관계 아닌 것만 열람, 본인 작성/삭제
create policy "posts readable" on posts
  for select to authenticated using (
    expires_at > now()
    and not exists (
      select 1 from blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = author_id)
         or (b.blocker_id = author_id and b.blocked_id = auth.uid())
    )
  );
create policy "posts self insert" on posts
  for insert to authenticated with check (author_id = auth.uid());
create policy "posts self delete" on posts
  for delete to authenticated using (author_id = auth.uid());

-- buddy_requests: 당사자만
create policy "buddy participants" on buddy_requests
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "buddy request insert" on buddy_requests
  for insert to authenticated with check (
    requester_id = auth.uid()
    and not exists (
      select 1 from blocks b
      where (b.blocker_id = addressee_id and b.blocked_id = auth.uid())
         or (b.blocker_id = auth.uid() and b.blocked_id = addressee_id)
    )
  );
create policy "buddy participants update" on buddy_requests
  for update to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- messages: 수락된 매칭의 당사자만
create policy "messages participants" on messages
  for select to authenticated using (
    exists (
      select 1 from buddy_requests r
      where r.id = request_id and r.status = 'accepted'
        and (r.requester_id = auth.uid() or r.addressee_id = auth.uid())
    )
  );
create policy "messages send" on messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from buddy_requests r
      where r.id = request_id and r.status = 'accepted'
        and (r.requester_id = auth.uid() or r.addressee_id = auth.uid())
    )
  );

-- 안전 데이터: 본인만
create policy "contacts owner" on emergency_contacts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "checkins owner" on check_ins
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 배지: 열람 공개
create policy "badges readable" on badges for select to authenticated using (true);
create policy "user badges readable" on user_badges for select to authenticated using (true);

-- 차단/신고: 본인 것만
create policy "blocks owner" on blocks
  for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "reports insert" on reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports own readable" on reports
  for select to authenticated using (reporter_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RPCs (security definer — 위치 프라이버시 필터는 반드시 서버에서)
-- ---------------------------------------------------------------------------

-- 내 위치 갱신 (upsert). 활성 체크인이 있으면 last_location도 함께 갱신
create function upsert_my_location(lat double precision, lng double precision,
                                   acc real default null, act activity_type default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into user_locations (user_id, location, accuracy_m, activity, recorded_at)
  values (auth.uid(), st_setsrid(st_makepoint(lng, lat), 4326)::geography, acc, act, now())
  on conflict (user_id) do update
    set location = excluded.location, accuracy_m = excluded.accuracy_m,
        activity = excluded.activity, recorded_at = now();

  update check_ins
     set last_location = st_setsrid(st_makepoint(lng, lat), 4326)::geography,
         last_location_at = now()
   where user_id = auth.uid() and status = 'active';
end $$;

-- 주변 포스트: 거리순, 만료·차단 제외
create function nearby_posts(lat double precision, lng double precision, radius_m int default 5000)
returns table (
  id uuid, author_id uuid, nickname text, avatar_url text,
  body text, image_url text, tags text[], activity activity_type,
  lat double precision, lng double precision, distance_m double precision,
  created_at timestamptz, expires_at timestamptz
) language sql security definer set search_path = public stable as $$
  select p.id, p.author_id, pr.nickname, pr.avatar_url,
         p.body, p.image_url, p.tags, p.activity,
         st_y(p.location::geometry), st_x(p.location::geometry),
         st_distance(p.location, st_setsrid(st_makepoint(lng, lat), 4326)::geography),
         p.created_at, p.expires_at
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

-- 주변 사용자: 프라이버시 강제 적용
--  ghost → 제외 / approximate → ~500m 그리드 스냅 / precise → 수락된 버디에게만 원좌표
create function nearby_users(lat double precision, lng double precision, radius_m int default 5000)
returns table (
  user_id uuid, nickname text, avatar_url text, activity activity_type,
  level int, lat double precision, lng double precision,
  is_approximate boolean, recorded_at timestamptz
) language sql security definer set search_path = public stable as $$
  with me as (select auth.uid() as uid)
  select ul.user_id, pr.nickname, pr.avatar_url, ul.activity, pr.level,
         case when pr.privacy = 'precise' and exists (
                select 1 from buddy_requests r
                where r.status = 'accepted'
                  and ((r.requester_id = ul.user_id and r.addressee_id = (select uid from me))
                    or (r.addressee_id = ul.user_id and r.requester_id = (select uid from me)))
              )
              then st_y(ul.location::geometry)
              else st_y(st_snaptogrid(ul.location::geometry, 0.005))
         end,
         case when pr.privacy = 'precise' and exists (
                select 1 from buddy_requests r
                where r.status = 'accepted'
                  and ((r.requester_id = ul.user_id and r.addressee_id = (select uid from me))
                    or (r.addressee_id = ul.user_id and r.requester_id = (select uid from me)))
              )
              then st_x(ul.location::geometry)
              else st_x(st_snaptogrid(ul.location::geometry, 0.005))
         end,
         pr.privacy <> 'precise',
         ul.recorded_at
    from user_locations ul
    join profiles pr on pr.id = ul.user_id
   where pr.privacy <> 'ghost'
     and ul.user_id <> (select uid from me)
     and ul.recorded_at > now() - interval '2 hours'   -- 오래된 위치는 노출 안 함
     and st_dwithin(ul.location, st_setsrid(st_makepoint(lng, lat), 4326)::geography, radius_m)
     and not exists (
       select 1 from blocks b
       where (b.blocker_id = (select uid from me) and b.blocked_id = ul.user_id)
          or (b.blocker_id = ul.user_id and b.blocked_id = (select uid from me))
     )
   limit 200;
$$;

-- ---------------------------------------------------------------------------
-- Realtime 발행
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table buddy_requests;
