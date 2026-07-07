-- 임시 비상 지킴이(버디) + 참가신청(호스트 승인제) + 활동별 단체 채팅

-- 1) 체크인에 임시 지킴이(버디 user_id 배열), 포스트↔체크인 연결
alter table check_ins add column if not exists guardian_ids uuid[] not null default '{}';
alter table posts
  add column if not exists check_in_id uuid references check_ins (id) on delete set null;

-- 2) 참가신청 (buddy_status enum 재사용: pending/accepted/declined/cancelled)
create table if not exists activity_participants (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null references check_ins (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  status buddy_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (check_in_id, user_id)
);
alter table activity_participants enable row level security;

-- 3) 활동 단체 채팅
create table if not exists activity_messages (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null references check_ins (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists activity_messages_idx on activity_messages (check_in_id, created_at);
alter table activity_messages enable row level security;

-- 활동 멤버 = 호스트 or 수락된 참가자
create or replace function is_activity_member(cid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from check_ins c where c.id = cid and c.user_id = uid)
      or exists (
        select 1 from activity_participants p
        where p.check_in_id = cid and p.user_id = uid and p.status = 'accepted'
      );
$$;

-- RLS: 참가신청
drop policy if exists "participants read" on activity_participants;
create policy "participants read" on activity_participants
  for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from check_ins c where c.id = check_in_id and c.user_id = auth.uid())
  );
drop policy if exists "participants apply" on activity_participants;
create policy "participants apply" on activity_participants
  for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "participants host update" on activity_participants;
create policy "participants host update" on activity_participants
  for update to authenticated using (
    exists (select 1 from check_ins c where c.id = check_in_id and c.user_id = auth.uid())
  );
drop policy if exists "participants self cancel" on activity_participants;
create policy "participants self cancel" on activity_participants
  for delete to authenticated using (user_id = auth.uid());

-- RLS: 단체 채팅
drop policy if exists "activity msg read" on activity_messages;
create policy "activity msg read" on activity_messages
  for select to authenticated using (is_activity_member(check_in_id, auth.uid()));
drop policy if exists "activity msg send" on activity_messages;
create policy "activity msg send" on activity_messages
  for insert to authenticated
  with check (sender_id = auth.uid() and is_activity_member(check_in_id, auth.uid()));

-- 4) 지킴이 지정 알림 (체크인 시작 시 클라이언트가 호출)
create or replace function notify_guardians(cid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g uuid; hostname text; loc text;
begin
  select nickname into hostname from profiles
   where id = (select user_id from check_ins where id = cid);
  select location_name into loc from check_ins where id = cid;
  for g in select unnest(guardian_ids) from check_ins where id = cid loop
    perform send_expo_push(g, '안전 지킴이로 지정되었어요 🛡️',
      coalesce(hostname, '누군가') || '님의 ' || coalesce(loc, '활동') ||
      ' 안전 지킴이로 지정되었어요. 늦어지면 알려드릴게요.');
  end loop;
end $$;

-- 5) 참가신청/수락 알림 트리거
create or replace function on_new_participant_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare host uuid; applicant text; loc text;
begin
  select user_id, location_name into host, loc from check_ins where id = new.check_in_id;
  select nickname into applicant from profiles where id = new.user_id;
  perform send_expo_push(host, '새 참가신청 🙋',
    coalesce(applicant, '누군가') || '님이 ' || coalesce(loc, '활동') || '에 참가신청했어요.');
  return new;
end $$;
drop trigger if exists trg_participant_push on activity_participants;
create trigger trg_participant_push after insert on activity_participants
  for each row execute function on_new_participant_push();

create or replace function on_participant_status_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare loc text;
begin
  if old.status = 'pending' and new.status in ('accepted', 'declined') then
    select location_name into loc from check_ins where id = new.check_in_id;
    perform send_expo_push(new.user_id,
      case when new.status = 'accepted' then '참가 수락됨 🎉' else '참가 거절됨' end,
      coalesce(loc, '활동') || case when new.status = 'accepted'
        then ' 참가가 수락됐어요. 단체 채팅을 확인하세요.'
        else ' 참가가 거절됐어요.' end);
  end if;
  return new;
end $$;
drop trigger if exists trg_participant_status on activity_participants;
create trigger trg_participant_status after update on activity_participants
  for each row execute function on_participant_status_push();

-- 6) 단체 채팅 메시지 → 나 빼고 전원에게
create or replace function on_activity_message_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare m uuid; sendername text;
begin
  select nickname into sendername from profiles where id = new.sender_id;
  for m in
    select user_id from check_ins where id = new.check_in_id and user_id <> new.sender_id
    union
    select user_id from activity_participants
     where check_in_id = new.check_in_id and status = 'accepted' and user_id <> new.sender_id
  loop
    perform send_expo_push(m, coalesce(sendername, '누군가') || ' · 단체 채팅', left(new.body, 80));
  end loop;
  return new;
end $$;
drop trigger if exists trg_activity_message on activity_messages;
create trigger trg_activity_message after insert on activity_messages
  for each row execute function on_activity_message_push();

-- 7) nearby_posts v4: check_in_id + 수락 참가자 수(joined_count) 반환
drop function if exists nearby_posts(double precision, double precision, int);
create function nearby_posts(lat double precision, lng double precision, radius_m int default 5000)
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
   order by st_distance(p.location, st_setsrid(st_makepoint(lng, lat), 4326)::geography)
   limit 100;
$$;

-- 8) 실시간 발행
alter publication supabase_realtime add table activity_messages;
alter publication supabase_realtime add table activity_participants;
