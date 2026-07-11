-- 크루 폭파(삭제) 가드: 크루장 외 수락된 멤버가 남아있으면 서버가 삭제를 거부한다.
-- (네이버 밴드 방식 — 전원 퇴장 후에만 폭파 가능. 클라이언트 우회 방지)
-- 폭파 시 crew_members/crew_messages는 cascade 삭제, posts.crew_id는 set null(글 유지).

create or replace function guard_crew_disband()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from crew_members m
    where m.crew_id = old.id
      and m.user_id <> old.owner_id
      and m.status = 'accepted'
  ) then
    raise exception '멤버가 남아있어 크루를 폭파할 수 없어요. 모든 멤버가 나간 후 다시 시도하세요.';
  end if;
  return old;
end;
$$;

drop trigger if exists crew_disband_guard on crews;
create trigger crew_disband_guard
  before delete on crews
  for each row execute function guard_crew_disband();
