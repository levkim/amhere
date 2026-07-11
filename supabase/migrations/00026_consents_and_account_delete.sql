-- 가입 동의 기록 + 회원 탈퇴
-- ① 약관 동의 일시·마케팅 수신 동의를 프로필에 기록 (개인정보보호법 증빙)
-- ② 회원 탈퇴 RPC: auth.users 삭제 → profiles 이하 전부 cascade 삭제.
--    단, 크루장인 크루가 있으면 거부(고아 크루 방지 — 먼저 폭파해야 함).

alter table profiles add column if not exists terms_agreed_at timestamptz;
alter table profiles add column if not exists marketing_opt_in boolean not null default false;

create or replace function delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception '로그인이 필요해요.';
  end if;

  -- 크루장인 크루가 남아 있으면 탈퇴 불가 (크루 폭파 가드 0021과 일관)
  if exists (select 1 from crews c where c.owner_id = uid) then
    raise exception '크루장으로 있는 크루가 있어요. 크루를 폭파한 후 탈퇴할 수 있어요.';
  end if;

  -- auth.users 삭제 → profiles(cascade) → 포스트·체크인·버디·메시지 등 전부 연쇄 삭제
  delete from auth.users where id = uid;
end;
$$;

revoke all on function delete_my_account() from public;
grant execute on function delete_my_account() to authenticated;
