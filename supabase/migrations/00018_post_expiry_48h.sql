-- 포스트 피드 만료를 24시간 → 48시간으로 연장 (신규 포스트부터 적용)
-- 기존 포스트는 각자의 만료 시각 유지. 데이터는 삭제되지 않고 피드 노출만 만료됨.
alter table posts alter column expires_at set default now() + interval '48 hours';
