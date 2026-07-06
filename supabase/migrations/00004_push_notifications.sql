-- 푸시 알림: 기기 토큰 저장 + DB 트리거로 Expo Push API 직접 호출
-- 새 메시지 / 버디 요청 / 요청 수락 시 상대방에게 알림을 보낸다.

create extension if not exists pg_net;

-- 사용자별 Expo 푸시 토큰 (기기당 1개, 최신 것만 유지)
create table if not exists device_tokens (
  user_id uuid primary key references profiles (id) on delete cascade,
  expo_push_token text not null,
  platform text,
  updated_at timestamptz not null default now()
);

alter table device_tokens enable row level security;

drop policy if exists "tokens owner" on device_tokens;
create policy "tokens owner" on device_tokens
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Expo Push API 호출 (토큰 없으면 조용히 무시)
create or replace function send_expo_push(target uuid, title text, body text)
returns void language plpgsql security definer set search_path = public as $$
declare tok text;
begin
  select expo_push_token into tok from device_tokens where user_id = target;
  if tok is null then return; end if;
  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('to', tok, 'title', title, 'body', body, 'sound', 'default')
  );
end $$;

-- 1) 새 채팅 메시지 → 상대방에게
create or replace function on_new_message_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare recipient uuid; sender_name text;
begin
  select case when r.requester_id = new.sender_id then r.addressee_id else r.requester_id end
    into recipient
    from buddy_requests r where r.id = new.request_id;
  select nickname into sender_name from profiles where id = new.sender_id;
  perform send_expo_push(recipient, coalesce(sender_name, '버디') || '님의 메시지', left(new.body, 80));
  return new;
end $$;

drop trigger if exists trg_message_push on messages;
create trigger trg_message_push
  after insert on messages
  for each row execute function on_new_message_push();

-- 2) 새 버디 요청 → 받는 사람에게
create or replace function on_new_buddy_request_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare requester_name text;
begin
  select nickname into requester_name from profiles where id = new.requester_id;
  perform send_expo_push(
    new.addressee_id,
    '새 버디 요청 🤝',
    coalesce(requester_name, '누군가') || '님이 ' || new.region || ' 버디를 제안했어요'
  );
  return new;
end $$;

drop trigger if exists trg_buddy_request_push on buddy_requests;
create trigger trg_buddy_request_push
  after insert on buddy_requests
  for each row execute function on_new_buddy_request_push();

-- 3) 요청 수락 → 요청 보낸 사람에게
create or replace function on_buddy_accept_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare addressee_name text;
begin
  if old.status = 'pending' and new.status = 'accepted' then
    select nickname into addressee_name from profiles where id = new.addressee_id;
    perform send_expo_push(
      new.requester_id,
      '버디 매칭 성사! 🎉',
      coalesce(addressee_name, '상대방') || '님이 요청을 수락했어요. 채팅을 시작해 보세요.'
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_buddy_accept_push on buddy_requests;
create trigger trg_buddy_accept_push
  after update on buddy_requests
  for each row execute function on_buddy_accept_push();
