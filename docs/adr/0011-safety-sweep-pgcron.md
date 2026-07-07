# 0011. 서버 안전 자동화: pg_cron in-DB 스윕

- 상태: 채택
- 날짜: 2026-07-07

## 배경

미귀환 경보와 예약 자동 시작은 앱이 꺼져 있어도 서버가 판정·발송해야 한다. 초기 설계(BACKEND.md)는 Edge Function + 외부 cron 호출이었으나, Edge Function은 별도 배포(supabase functions deploy)가 필요해 이 프로젝트(초보 사용자, SQL 붙여넣기 워크플로)에선 미배포 상태로 남아 있었다.

## 결정

Edge Function 대신 **pg_cron으로 DB 안에서** `safety_sweep()`를 5분마다 실행한다. 마이그레이션 SQL 하나로 완결(별도 배포 불필요).

- **예약 자동 시작**: scheduled_start_at +30분 경과 & 여전히 scheduled → active.
- **미귀환 경보**: active & expected_end_at +15분 초과 → alerted, 본인+지킴이(버디)에게 send_expo_push.
- 알림은 기존 pg_net 기반 send_expo_push(ADR 0006) 재사용.

## 대안

- **Edge Function + 외부 cron**: 표준적이나 배포 단계가 별도로 필요해 실제로 안 돌던 원인 — 기각(대체).
- **클라이언트 타이머**: 앱이 꺼지면 무력 — 기각.

## 결과

- 배포 없이 SQL만으로 안전 자동화 완성. 앱이 꺼져 있어도 경보 동작.
- 감수: (1) 전화번호 비상연락처 SMS는 외부 프로바이더(Twilio/알리고) 연동 필요 — 현재는 본인·버디 푸시만. (2) pg_cron 확장은 Supabase에서 활성화 필요할 수 있음.
- 대체: BACKEND.md의 Edge Function 기반 safety-sweep 계획을 대체함.
