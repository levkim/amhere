# 0002. 백엔드: Supabase

- 상태: 채택
- 날짜: 2026-07-06

## 배경

위치 기반 쿼리(주변 포스트/사용자), 실시간 피드/채팅, 전화번호 인증, 파일 저장이 모두 필요하다. 백엔드 서버를 직접 만들 인력이 없다.

## 결정

Supabase 하나로 통합: Auth(전화 OTP) + Postgres/PostGIS(위치 쿼리) + Realtime(피드·채팅) + Storage(사진) + Edge Functions. 비즈니스 규칙은 RLS와 security definer RPC로 DB에 둔다 — 클라이언트는 신뢰하지 않는다.

## 대안

- **Firebase**: 실시간은 강하지만 위치 반경 쿼리(PostGIS 급)가 약함, SQL 불가
- **자체 서버(Node 등)**: 유연하지만 1인 팀이 인증·보안·인프라까지 감당 불가

## 결과

- 서버 코드 거의 없이 MVP 완성, 무료 티어로 시작
- 감수: Supabase 종속, 복잡한 로직은 SQL/plpgsql로 작성해야 함
