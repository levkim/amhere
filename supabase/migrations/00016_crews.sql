-- 크루(그룹): 지속적인 모임. 가입 방식은 크루장이 선택(open/approval).

create table if not exists crews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 30),
  description text check (char_length(description) <= 300),
  activity activity_type,
  region text,
  emoji text not null default '🏔️',
  join_mode text not null default 'open' check (join_mode in ('open', 'approval')),
  owner_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists crew_members (
  crew_id uuid not null references crews (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status buddy_status not null default 'accepted',
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create table if not exists crew_messages (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crews (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists crew_messages_idx on crew_messages (crew_id, created_at);

alter table crews enable row level security;
alter table crew_members enable row level security;
alter table crew_messages enable row level security;

create or replace function is_crew_member(cid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from crew_members m
    where m.crew_id = cid and m.user_id = uid and m.status = 'accepted'
  );
$$;

-- crews: 탐색은 전체 공개, 생성/수정/삭제는 크루장
drop policy if exists "crews readable" on crews;
create policy "crews readable" on crews for select to authenticated using (true);
drop policy if exists "crews insert" on crews;
create policy "crews insert" on crews
  for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "crews owner update" on crews;
create policy "crews owner update" on crews
  for update to authenticated using (owner_id = auth.uid());
drop policy if exists "crews owner delete" on crews;
create policy "crews owner delete" on crews
  for delete to authenticated using (owner_id = auth.uid());

-- crew_members: 수락된 멤버는 공개, 대기(pending)는 본인·크루장만
drop policy if exists "crew members readable" on crew_members;
create policy "crew members readable" on crew_members
  for select to authenticated using (
    status = 'accepted'
    or user_id = auth.uid()
    or exists (select 1 from crews c where c.id = crew_id and c.owner_id = auth.uid())
  );

-- 가입: open이면 바로 accepted, approval이면 pending / 크루장 본인 등록은 owner
drop policy if exists "crew members join" on crew_members;
create policy "crew members join" on crew_members
  for insert to authenticated with check (
    user_id = auth.uid()
    and (
      (role = 'owner'
        and exists (select 1 from crews c where c.id = crew_id and c.owner_id = auth.uid()))
      or (role = 'member' and status = 'accepted'
        and exists (select 1 from crews c where c.id = crew_id and c.join_mode = 'open'))
      or (role = 'member' and status = 'pending'
        and exists (select 1 from crews c where c.id = crew_id and c.join_mode = 'approval'))
    )
  );

-- 크루장: 대기 멤버 수락/거절
drop policy if exists "crew members owner update" on crew_members;
create policy "crew members owner update" on crew_members
  for update to authenticated using (
    exists (select 1 from crews c where c.id = crew_id and c.owner_id = auth.uid())
  );

-- 탈퇴(본인, 크루장 제외) 또는 크루장이 멤버 내보내기
drop policy if exists "crew members leave" on crew_members;
create policy "crew members leave" on crew_members
  for delete to authenticated using (
    (user_id = auth.uid() and role <> 'owner')
    or (role <> 'owner'
      and exists (select 1 from crews c where c.id = crew_id and c.owner_id = auth.uid()))
  );

-- crew_messages: 멤버만
drop policy if exists "crew msg read" on crew_messages;
create policy "crew msg read" on crew_messages
  for select to authenticated using (is_crew_member(crew_id, auth.uid()));
drop policy if exists "crew msg send" on crew_messages;
create policy "crew msg send" on crew_messages
  for insert to authenticated
  with check (sender_id = auth.uid() and is_crew_member(crew_id, auth.uid()));

-- 크루 목록 (멤버 수 + 내 상태 포함)
create or replace function list_crews()
returns table (
  id uuid, name text, description text, activity activity_type, region text,
  emoji text, join_mode text, owner_id uuid, member_count bigint, my_status text
) language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.description, c.activity, c.region, c.emoji, c.join_mode, c.owner_id,
         (select count(*) from crew_members m where m.crew_id = c.id and m.status = 'accepted'),
         (select m2.status::text from crew_members m2
           where m2.crew_id = c.id and m2.user_id = auth.uid())
    from crews c
   order by (select count(*) from crew_members m3
              where m3.crew_id = c.id and m3.status = 'accepted') desc, c.created_at desc
   limit 100;
$$;

-- 알림 트리거: 가입 신청 → 크루장 / 수락 → 신청자 / 크루 채팅 → 멤버들
create or replace function on_crew_join_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare crew_name text; owner_uid uuid; applicant text;
begin
  select name, owner_id into crew_name, owner_uid from crews where id = new.crew_id;
  select nickname into applicant from profiles where id = new.user_id;
  if new.role = 'owner' then return new; end if;
  if new.status = 'pending' then
    perform send_expo_push(owner_uid, '크루 가입 신청 🙋',
      coalesce(applicant, '누군가') || '님이 ' || crew_name || ' 가입을 신청했어요.');
  elsif new.status = 'accepted' then
    perform send_expo_push(owner_uid, '새 크루원 🎉',
      coalesce(applicant, '누군가') || '님이 ' || crew_name || '에 가입했어요.');
  end if;
  return new;
end $$;
drop trigger if exists trg_crew_join on crew_members;
create trigger trg_crew_join after insert on crew_members
  for each row execute function on_crew_join_push();

create or replace function on_crew_member_status_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare crew_name text;
begin
  if old.status = 'pending' and new.status in ('accepted', 'declined') then
    select name into crew_name from crews where id = new.crew_id;
    perform send_expo_push(new.user_id,
      case when new.status = 'accepted' then '크루 가입 승인 🎉' else '크루 가입 거절' end,
      crew_name || case when new.status = 'accepted'
        then ' 크루원이 됐어요. 크루 채팅을 확인해 보세요.'
        else ' 가입이 거절됐어요.' end);
  end if;
  return new;
end $$;
drop trigger if exists trg_crew_member_status on crew_members;
create trigger trg_crew_member_status after update on crew_members
  for each row execute function on_crew_member_status_push();

create or replace function on_crew_message_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare m uuid; sendername text; crew_name text;
begin
  select nickname into sendername from profiles where id = new.sender_id;
  select name into crew_name from crews where id = new.crew_id;
  for m in
    select user_id from crew_members
     where crew_id = new.crew_id and status = 'accepted' and user_id <> new.sender_id
  loop
    perform send_expo_push(m, crew_name || ' 💬',
      coalesce(sendername, '누군가') || ': ' || left(new.body, 60));
  end loop;
  return new;
end $$;
drop trigger if exists trg_crew_message on crew_messages;
create trigger trg_crew_message after insert on crew_messages
  for each row execute function on_crew_message_push();

-- 실시간 (이미 추가돼 있으면 건너뜀)
do $$
begin
  alter publication supabase_realtime add table crew_messages;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table crew_members;
exception when duplicate_object then null;
end $$;
