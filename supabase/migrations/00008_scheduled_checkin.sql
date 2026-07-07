-- 예약 체크인: '무엇을 하나요' 제목, 시작 예약 시각, scheduled 상태
alter type checkin_status add value if not exists 'scheduled';

alter table check_ins add column if not exists title text;
alter table check_ins
  add column if not exists scheduled_start_at timestamptz not null default now();
alter table check_ins add column if not exists start_prompt_sent_at timestamptz;

-- 진행/예약 중(=미완료) 체크인은 시간 조회가 잦으므로 인덱스.
-- 새 enum 값('scheduled')을 같은 트랜잭션에서 쓰면 오류가 나므로 completed_at으로 조건을 건다.
create index if not exists check_ins_open_idx
  on check_ins (scheduled_start_at)
  where completed_at is null;
