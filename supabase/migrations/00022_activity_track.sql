-- 활동 트래킹: 체크인에 이동 경로(GPS 좌표 배열) + 이동 거리 저장
alter table check_ins add column if not exists track jsonb not null default '[]';
alter table check_ins add column if not exists track_distance_m real not null default 0;
