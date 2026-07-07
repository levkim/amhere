-- 서버 안전 자동화: 5분마다 예약 자동시작 + 미귀환 경보 (앱이 꺼져 있어도 동작)
-- 필요 확장: pg_cron (스케줄), pg_net (Expo 푸시 — 00004에서 이미 사용)

create extension if not exists pg_cron;

create or replace function safety_sweep()
returns void language plpgsql security definer set search_path = public as $$
declare rec record; g uuid;
begin
  -- A) 예약 자동 시작: 시작 예정 시각 30분 경과 & 여전히 예약 상태 → 감시 시작
  --    (앱이 열려 있으면 사용자가 '지금 시작'으로 먼저 활성화, 여기선 앱 꺼진 경우 백스톱)
  update check_ins
     set status = 'active'
   where status = 'scheduled'
     and scheduled_start_at <= now() - interval '30 minutes';

  -- B) 미귀환 경보: 활동 중 & 종료 예정 +15분 초과 → alerted 전환 후 경보 발송
  for rec in
    update check_ins
       set status = 'alerted'
     where status = 'active'
       and expected_end_at < now() - interval '15 minutes'
     returning id, user_id, location_name, guardian_ids
  loop
    -- 본인에게
    perform send_expo_push(
      rec.user_id,
      '⚠️ 체크아웃 시간이 지났어요',
      coalesce(rec.location_name, '활동') ||
      ' 활동이 예정 시간을 넘겼어요. 안전하면 앱에서 체크아웃해 주세요.'
    );
    -- 지킴이(버디)들에게
    foreach g in array rec.guardian_ids loop
      perform send_expo_push(
        g,
        '⚠️ 안전 경보',
        (select coalesce(nickname, '누군가') from profiles where id = rec.user_id) ||
        '님이 ' || coalesce(rec.location_name, '활동') ||
        '에서 예정 시간을 넘겼어요. 연락해 보세요.'
      );
    end loop;
    -- TODO: 전화번호 비상연락처(emergency_contacts) SMS 발송은 외부 SMS 프로바이더 연동 필요(후속)
  end loop;
end $$;

-- 5분마다 실행 (기존 스케줄 있으면 교체)
do $$
begin
  perform cron.unschedule('safety-sweep');
exception when others then null;
end $$;

select cron.schedule('safety-sweep', '*/5 * * * *', $$ select safety_sweep(); $$);
