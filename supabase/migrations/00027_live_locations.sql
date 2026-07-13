-- 활동 라이브 위치 공유: 진행 중인 아웃도어 활동의 호스트+수락된 동행이
-- 서로의 실시간 위치·경로 꼬리를 본다 (Life360 방식, 활동 멤버 한정).

create table if not exists live_locations (
  check_in_id uuid not null references check_ins (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  -- 최근 경로 꼬리 [{lat,lng,t}] — 클라이언트가 최대 ~60포인트로 잘라 보냄
  trail jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (check_in_id, user_id)
);

alter table live_locations enable row level security;

-- 활동 멤버 판별: 호스트이거나 수락된 동행
create or replace function is_activity_member(cid uuid, uid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from check_ins c where c.id = cid and c.user_id = uid)
      or exists (
        select 1 from activity_participants ap
        where ap.check_in_id = cid and ap.user_id = uid and ap.status = 'accepted'
      );
$$;

drop policy if exists "live member read" on live_locations;
create policy "live member read" on live_locations
  for select to authenticated
  using (is_activity_member(check_in_id, auth.uid()));

drop policy if exists "live self write" on live_locations;
create policy "live self write" on live_locations
  for insert to authenticated
  with check (user_id = auth.uid() and is_activity_member(check_in_id, auth.uid()));

drop policy if exists "live self update" on live_locations;
create policy "live self update" on live_locations
  for update to authenticated
  using (user_id = auth.uid());

-- 본인 행 삭제(공유 중단) + 호스트는 활동 종료 시 전체 정리 가능
drop policy if exists "live delete" on live_locations;
create policy "live delete" on live_locations
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from check_ins c where c.id = check_in_id and c.user_id = auth.uid())
  );

-- 실시간 구독
do $$ begin
  alter publication supabase_realtime add table live_locations;
exception when duplicate_object then null; end $$;

-- 오래된 라이브 위치 자동 정리 (활동이 비정상 종료돼도 12시간 뒤 삭제)
do $$ begin
  perform cron.schedule(
    'live-locations-cleanup',
    '30 * * * *',
    $job$ delete from live_locations where updated_at < now() - interval '12 hours' $job$
  );
exception when others then null; end $$;
