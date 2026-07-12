-- 종료된 아웃도어 활동에는 참가신청 불가 (서버 강제)
-- 신청자는 호스트의 check_ins 행을 RLS 때문에 못 읽으므로 security definer 헬퍼로 상태만 확인한다.

create or replace function check_in_joinable(cid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from check_ins c
    where c.id = cid and c.status in ('scheduled', 'active')
  );
$$;

drop policy if exists "participants apply" on activity_participants;
create policy "participants apply" on activity_participants
  for insert to authenticated with check (
    user_id = auth.uid()
    and status = 'pending'
    and check_in_joinable(check_in_id)
  );
