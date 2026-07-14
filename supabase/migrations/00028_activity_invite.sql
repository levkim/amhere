-- 채팅 활동 초대: (1) 내가 공유할 수 있는 활동 목록, (2) 거리 무관 포스트 단건 조회
-- 초대 카드를 받은 사람이 멀리 있어도 활동 상세를 열고 참가신청할 수 있어야 한다.

-- (1) 공유 가능한 활동 = 진행예정(scheduled)/진행중(active) + 동행구함 +
--     내가 호스트이거나 수락된 참가자인 활동
create or replace function my_shareable_activities()
returns table (
  post_id uuid,
  check_in_id uuid,
  title text,
  place_name text,
  activity activity_type,
  status text,
  scheduled_start_at timestamptz
) language sql security definer set search_path = public stable as $$
  select p.id, c.id,
         coalesce(nullif(c.title, ''), left(p.body, 40)),
         coalesce(nullif(p.place_name, ''), c.location_name),
         p.activity, c.status::text, c.scheduled_start_at
    from posts p
    join check_ins c on c.id = p.check_in_id
   where c.status in ('scheduled', 'active')
     and p.tags @> array['동행구함']
     and (
       c.user_id = auth.uid()
       or exists (
         select 1 from activity_participants ap
         where ap.check_in_id = c.id and ap.user_id = auth.uid() and ap.status = 'accepted'
       )
     )
   order by c.scheduled_start_at;
$$;

-- (2) 포스트 단건 조회 (거리 제한 없음) — nearby_posts와 동일한 형태 반환.
--     초대 링크로 받은 활동은 거리와 무관하게 열려야 하므로, 동행구함 체크인 포스트는
--     공개 여부와 상관없이 열람 허용(참여 목적). 그 외엔 기존 공개 규칙을 따른다.
create or replace function post_detail(pid uuid)
returns table (
  id uuid, author_id uuid, nickname text, avatar_url text,
  body text, image_url text, tags text[], activity activity_type,
  lat double precision, lng double precision, distance_m double precision,
  created_at timestamptz, expires_at timestamptz,
  helpful_count bigint, i_helped boolean, visibility text,
  check_in_id uuid, joined_count bigint, place_name text,
  scheduled_start_at timestamptz,
  checkin_status text, checkin_title text, checkin_location text
) language sql security definer set search_path = public stable as $$
  select p.id, p.author_id, pr.nickname, pr.avatar_url,
         p.body, p.image_url, p.tags, p.activity,
         st_y(p.location::geometry), st_x(p.location::geometry),
         0::double precision,
         p.created_at, p.expires_at,
         (select count(*) from post_reactions r where r.post_id = p.id),
         exists (select 1 from post_reactions r where r.post_id = p.id and r.user_id = auth.uid()),
         p.visibility,
         p.check_in_id,
         (select count(*) from activity_participants ap
           where ap.check_in_id = p.check_in_id and ap.status = 'accepted'),
         p.place_name,
         ci.scheduled_start_at,
         ci.status::text, ci.title, ci.location_name
    from posts p
    join profiles pr on pr.id = p.author_id
    left join check_ins ci on ci.id = p.check_in_id
   where p.id = pid
     and not exists (
       select 1 from blocks b
       where (b.blocker_id = auth.uid() and b.blocked_id = p.author_id)
          or (b.blocker_id = p.author_id and b.blocked_id = auth.uid())
     )
     and (
       p.visibility = 'public'
       or p.author_id = auth.uid()
       or (p.visibility = 'friends' and are_buddies(auth.uid(), p.author_id))
       -- 동행구함 활동 초대는 거리·친구 여부와 무관하게 열람 허용
       or (p.check_in_id is not null and p.tags @> array['동행구함'])
     );
$$;
