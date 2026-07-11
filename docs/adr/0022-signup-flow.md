# 0022. 가입 플로우: 전화+Google, 일괄 약관 동의, 탈퇴 RPC

- 상태: 채택
- 날짜: 2026-07-12

## 맥락

출시 전 가입 관련 3가지 구멍(약관 동의 실체 없음, 회원 탈퇴 없음, 연령 확인 없음)과
가입 수단 단일화(전화 OTP뿐)를 보완해야 한다. 스토어 정책상 계정 삭제 기능은 필수.

## 결정

1. **가입 수단 = 전화번호 OTP + Google** (iOS 출시 시 Apple 추가 의무)
   - 전화번호: 버디 매칭 신뢰의 근간(당근·Zenly 패턴) — 유지
   - Google: Android 진입장벽 최소화(Strava·AllTrails 패턴). 네이티브 SDK
     (`@react-native-google-signin`) + `signInWithIdToken`으로 Supabase 세션 교환.
     `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` 없으면 버튼 숨김 → 설정 전에도 안전
   - Kakao는 개발자 등록·심사 부담으로 후순위 보류
2. **약관 동의 = 온보딩 step 0** (당근·토스식 일괄 동의)
   - 필수 4: 만 14세 이상(연령 확인 겸용)·이용약관·개인정보·위치기반서비스 / 선택 1: 마케팅
   - 약관 3종 초안을 앱 내 화면(`legal/*`)으로 탑재. 동의 일시를
     `profiles.terms_agreed_at`에 기록(법적 증빙). 스토어용 공개 URL 호스팅은 출시 준비에서
   - 본인인증(PASS)은 비용·복잡도 대비 과해서 체크박스 방식 채택
3. **회원 탈퇴 = security definer RPC** `delete_my_account()`
   - `auth.users` 삭제 → profiles 이하 전부 cascade. 크루장인 크루가 있으면 거부(고아 크루 방지)
   - Storage 파일(아바타·사진)은 고아로 남음 — 추후 정리 배치 과제
4. **버전 0.2.0으로 상향**: 네이티브 모듈 추가로 런타임을 분리해 구빌드가
   Google SDK import가 포함된 JS를 OTA로 받아 크래시 나는 것을 차단

## 영향

- 재빌드 필요. Google 활성화는 사용자가 Google Cloud OAuth 클라이언트 생성 +
  Supabase Google provider 설정 후, env 주입 → OTA로 켤 수 있음(재빌드 불필요)
- 약관 초안은 출시 전 법률 검토 권장, 사업자 정보 기재 필요
