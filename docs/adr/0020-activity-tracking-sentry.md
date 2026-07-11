# 0020. 활동 경로 트래킹 + Sentry 크래시 리포팅

- 상태: 채택
- 날짜: 2026-07-11

## 맥락

Strava·AllTrails처럼 아웃도어 활동의 **이동 경로**를 지도에 남기고 거리·시간·페이스를
자동 계산하고 싶다. 화면이 꺼져 있어도(주머니 속 폰) 경로가 끊기면 안 된다.
또한 출시를 앞두고 실사용 크래시를 잡을 관측 수단이 필요하다.

## 결정

### 1) 백그라운드 경로 트래킹
- `expo-location` + `expo-task-manager`로 백그라운드 위치 태스크(`TRACK_TASK`)를 정의한다.
  태스크는 앱 시작 시 최상위에서 등록되도록 `src/app/_layout.tsx`에서 엔진 모듈을 import 한다.
- 좌표는 `AsyncStorage`에 누적하고, 체크아웃(complete) 시점에 `check_ins.track`(jsonb)과
  `track_distance_m`(하버사인 누적)로 저장한다. → 마이그레이션 `00022`.
- 배터리 관리: `accuracy=Balanced`, `distanceInterval=15m`, `deferredUpdatesInterval=10s`.
- Android는 포그라운드 서비스 알림("경로 기록 중")으로 사용자에게 명시한다
  (`app.config.js`의 `isAndroidForegroundServiceEnabled`, iOS는 `UIBackgroundModes: location`).
- **옵트인**: 체크인 화면의 "🛰️ 이동 경로 기록" 토글로 사용자가 켤 때만 기록한다.
  예약 체크인은 실제 시작(active 전환) 시점부터 기록한다.
- 결과는 `activity/[id]/record` 화면에서 Mapbox `LineLayer` 경로 + 통계로 보여준다.
  웹은 네이티브 지도를 못 쓰므로 `route-map.web.tsx` 안내 폴백을 둔다.

### 2) Sentry
- `@sentry/react-native`를 Expo config plugin으로 추가하고, 루트를 `Sentry.wrap`으로 감싼다.
- DSN은 `EXPO_PUBLIC_SENTRY_DSN` 환경변수로 주입한다. **DSN이 없으면 조용히 비활성**되어
  개발·데모에 영향이 없다. 이벤트 전송은 릴리스(`!__DEV__`)에서만, PII는 끈다.

## 대안

- **포그라운드 전용 추적**: 구현은 쉽지만 화면을 끄면 경로가 끊겨 아웃도어 용도에 부적합 → 기각.
- **항상 기록(옵트인 없음)**: 배터리·프라이버시 부담이 커 토글 옵트인으로 결정.
- **크래시 리포팅 미도입**: 출시 후 이슈 파악이 어려워 지금 도입.

## 영향

- 네이티브 모듈(`expo-task-manager`, `@sentry/react-native`)이 추가되어 **재빌드 필요**
  (OTA 업데이트로는 배포 불가).
- `check_ins`에 `track`/`track_distance_m` 컬럼 추가(00022), `nearby_posts` v7에서
  체크인 상태·제목·장소를 함께 반환(00023, 피드 표기용).
