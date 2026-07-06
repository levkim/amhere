-- 아웃도어 체크인에 "나의 활동 태그" 저장칸 추가
alter table check_ins add column if not exists tags text[] not null default '{}';
