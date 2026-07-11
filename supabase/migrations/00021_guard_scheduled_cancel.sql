-- 예약 체크인 취소 가드: 동행 신청자(대기/수락)가 남아 있으면 호스트가 예약을 취소할 수 없다.
-- 신청자가 모두 취소/거절되어 나간 뒤에만 취소 가능. (서버 강제 — 클라이언트 우회 불가)

create or replace function guard_scheduled_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'scheduled' and new.status = 'completed' then
    if exists (
      select 1 from activity_participants ap
      where ap.check_in_id = old.id and ap.status in ('pending', 'accepted')
    ) then
      raise exception '동행 신청자가 있어 예약을 취소할 수 없어요. 신청자가 모두 나간 후 취소할 수 있어요.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_scheduled_cancel on check_ins;
create trigger trg_guard_scheduled_cancel
  before update on check_ins
  for each row execute function guard_scheduled_cancel();
