-- 예약 체크인: '무엇을 하나요' 제목, 시작 예약 시각, scheduled 상태
alter type checkin_status add value if not exists 'scheduled';

alter table check_ins add column if not exists title text;
alter table check_ins
  add column if not exists scheduled_start_at timestamptz not null default now();
alter table check_ins add column if not exists start_prompt_sent_at timestamptz;

-- 예약/진행 중 체크인은 시간 조회가 잦으므로 인덱스
create index if not exists check_ins_scheduled_idx
  on check_ins (scheduled_start_at)
  where status in ('scheduled', 'active');
