# 0006. 푸시: DB 트리거 → Expo Push API 직접 호출

- 상태: 채택
- 날짜: 2026-07-06

## 배경

버디 요청/수락/새 메시지 때 알림이 필요하다. 일반적 구조는 "DB webhook → Edge Function → 푸시 서비스"인데, 관리할 조각이 많다.

## 결정

Postgres 트리거에서 `pg_net`으로 **Expo Push API를 직접 호출**한다 (`send_expo_push` 함수). Edge Function, webhook 설정 없이 마이그레이션 SQL 하나로 완결된다. 안드로이드 전달은 Firebase FCM V1 (서비스 계정 키를 EAS credentials에 업로드).

## 대안

- **DB webhook + Edge Function**: 표준적이지만 관리 포인트 증가 — MVP엔 과함
- **클라이언트에서 발송**: 보낸 사람 앱이 꺼져 있으면 유실, 위변조 가능 — 기각

## 결과

- 알림 로직이 데이터 변경과 원자적으로 결합, 설정 단순
- 감수: 발송 실패 재시도/영수증 처리 없음 (Expo receipt 미확인). 대량 발송 시 Edge Function 구조로 전환 필요 — 그때 이 ADR을 대체할 것
