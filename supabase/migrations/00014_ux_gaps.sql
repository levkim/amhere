-- UX 빈틈 메우기: 알림함 + 내 포스트(만료 포함) 조회

-- 1) 알림함 테이블
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  body text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
alter table notifications enable row level security;

drop policy if exists "notifications owner read" on notifications;
create policy "notifications owner read" on notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications owner update" on notifications;
create policy "notifications owner update" on notifications
  for update to authenticated using (user_id = auth.uid());

-- 2) send_expo_push: 푸시 발송 전에 알림함에 기록
--    (버디·참가·경보·채팅 등 모든 알림이 이 함수를 지나므로 한 곳만 고치면 전부 쌓인다)
create or replace function send_expo_push(target uuid, title text, body text)
returns void language plpgsql security definer set search_path = public as $$
declare tok text;
begin
  insert into notifications (user_id, title, body) values (target, title, body);

  select expo_push_token into tok from device_tokens where user_id = target;
  if tok is null then return; end if;
  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('to', tok, 'title', title, 'body', body, 'sound', 'default')
  );
end $$;

-- 3) 내 포스트는 만료돼도 본인이 조회 가능 (기존 정책과 OR로 합쳐짐)
drop policy if exists "posts own readable" on posts;
create policy "posts own readable" on posts
  for select to authenticated using (author_id = auth.uid());

-- 4) 알림함 실시간 반영
alter publication supabase_realtime add table notifications;
