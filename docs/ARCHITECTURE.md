# Amhere — 앱 구조 (React Native + Expo)

> 버전 0.1 · 2026-07-06 · PRD: [PRD.md](PRD.md)

## 1. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | **Expo SDK (최신) + React Native, TypeScript** | 단일 코드베이스, Windows에서 iOS 빌드(EAS) |
| 네비게이션 | **Expo Router** (파일 기반) | 딥링크 자동 지원(피드 핀 공유에 필수) |
| 지도 | **@rnmapbox/maps** | 아웃도어 지형/오프라인 지도 강점 |
| 서버 상태 | **TanStack Query** | 캐싱·재시도·오프라인 큐의 표준 |
| 클라이언트 상태 | **Zustand** | 가볍고 보일러플레이트 없음 |
| 백엔드 | **Supabase** (Auth, Postgres+PostGIS, Realtime, Storage, Edge Functions) | 위치 쿼리(PostGIS)와 실시간 피드를 한 서비스로 |
| 위치 | **expo-location** + expo-task-manager(백그라운드) | 안전 체크인 시에만 백그라운드 |
| 푸시 | **expo-notifications** | 매칭·안전 알림 |
| 폼/검증 | react-hook-form + zod | |
| 분석/크래시 | PostHog + Sentry | Expo 공식 지원 |
| 빌드/배포 | **EAS Build + EAS Update(OTA)** | Mac 없이 iOS 제출, 심사 없이 JS 핫픽스 |

## 2. 폴더 구조

```
amhere/
├── app/                        # Expo Router — 라우트 = 화면
│   ├── (auth)/                 # 비로그인 그룹
│   │   ├── welcome.tsx
│   │   ├── sign-in.tsx
│   │   └── verify-phone.tsx
│   ├── (tabs)/                 # 메인 탭 그룹
│   │   ├── index.tsx           # 🗺️ 라이브 맵 (홈)
│   │   ├── feed.tsx            # 실시간 피드 리스트
│   │   ├── buddies.tsx         # 버디 매칭
│   │   └── profile.tsx
│   ├── post/[id].tsx           # 피드 상세 (딥링크 대상)
│   ├── chat/[matchId].tsx      # 버디 1:1 채팅
│   ├── safety/                 # 안전 체크인 플로우
│   │   ├── check-in.tsx
│   │   └── active.tsx          # 활동 중 상태 화면
│   └── _layout.tsx             # 루트: 인증 가드, 프로바이더
├── src/
│   ├── components/
│   │   ├── ui/                 # Button, Card, Input, Badge... (디자인 시스템)
│   │   └── map/                # MapView 래퍼, UserMarker, FeedPin, ClusterLayer
│   ├── features/               # 도메인별 로직 (화면과 분리)
│   │   ├── auth/
│   │   ├── feed/               # hooks, api, types per feature
│   │   ├── matching/
│   │   ├── safety/
│   │   └── location/           # 위치 추적 엔진 (모드별 프리셋)
│   ├── lib/
│   │   ├── supabase.ts         # 클라이언트 싱글턴
│   │   ├── query-client.ts
│   │   └── analytics.ts
│   ├── stores/                 # Zustand: session, locationMode, mapViewport
│   ├── hooks/                  # 공용 훅 (useAppState, useOnline...)
│   ├── theme/                  # 색·타이포·간격 토큰
│   └── i18n/                   # ko 기본, en 확장 대비
├── supabase/
│   ├── migrations/             # DB 스키마 (PostGIS 포함)
│   └── functions/              # Edge Functions (안전 알림 판정 등)
├── app.config.ts               # 권한 문구, Mapbox 토큰, EAS 설정
└── eas.json                    # dev / preview / production 빌드 프로파일
```

**원칙**: 화면(`app/`)은 얇게 — 데이터 로직은 전부 `src/features/*`의 훅으로. 화면은 훅을 조립만 한다.

## 3. 핵심 화면 (MVP)

| 화면 | 역할 | 핵심 상태 |
|---|---|---|
| 라이브 맵 (홈) | 주변 활동자 + 피드 핀. 앱의 첫 화면 | 위치권한 거부 시 지역 선택 폴백 |
| 피드 | 현재 지도 영역의 포스트 리스트 (24h 만료) | 빈 상태 = "첫 포스트를 남겨보세요" CTA |
| 포스트 작성 | 사진 + 태그(설질/트레일 상태 등) + 한줄 | 오프라인이면 큐에 저장 후 자동 전송 |
| 버디 매칭 | 활동/지역/날짜/레벨 필터 → 요청 → 채팅 | 매칭 전엔 대략 위치만 노출 |
| 안전 체크인 | 예상 종료 시간 + 비상연락처 → 활동 시작 | 백그라운드 위치는 이 상태에서만 ON |
| 프로필 | 활동 뱃지, 위치 공개 설정(정확/대략/고스트) | |

## 4. 상태 관리 규칙

- **서버 데이터** (피드, 매칭, 프로필) → TanStack Query. 키 규칙: `['feed', regionHash]`, `['matches', userId]`.
- **실시간** → Supabase Realtime 구독 → 수신 시 해당 쿼리 캐시에 직접 반영(`setQueryData`).
- **클라이언트 상태** → Zustand 3개 스토어만: `sessionStore`(인증), `locationStore`(추적 모드·최근 좌표), `uiStore`(지도 뷰포트·시트 상태). 그 외 전역 상태 금지.

## 5. API 레이어

- 화면 → feature 훅 (`useFeed()`, `useCheckIn()`) → `src/features/*/api.ts` → Supabase 클라이언트. 화면에서 supabase 직접 호출 금지.
- 위치 쿼리는 PostGIS RPC로: `nearby_posts(lat, lng, radius_m)` — 클라이언트 필터링 금지.
- 안전 판정(체크아웃 시간 초과)은 **서버(Edge Function + pg_cron)**에서. 클라이언트 타이머에 의존하지 않는다(앱 종료·무신호 대비).

## 6. 인증 플로우

1. Welcome → 전화번호 입력 → Supabase Auth OTP(SMS) 인증
2. 최초 로그인 시 온보딩: 닉네임 → 활동 선택 → 위치 공개 수준(기본: 대략)
3. 세션은 Supabase가 SecureStore에 자동 영속화. `_layout.tsx`의 가드가 `(auth)` ↔ `(tabs)` 라우팅 분기.

## 7. 스토리지 & 오프라인

- 이미지: Supabase Storage, 업로드 전 클라이언트 리사이즈(expo-image-manipulator).
- 캐시: TanStack Query persist(MMKV) → 무신호 지역에서도 마지막 피드 열람 가능.
- 쓰기 큐: 오프라인 포스트/체크아웃은 로컬 큐 저장 → 재연결 시 자동 flush.

## 8. 에러 처리 & 분석

- 전역 ErrorBoundary + Sentry. 위치·네트워크 오류는 사용자 언어로("GPS 신호가 약해요 — 하늘이 보이는 곳으로 이동해 보세요").
- 분석 이벤트 최소 셋: `map_opened`, `post_created`, `match_requested`, `checkin_started`, `checkin_completed`, `checkin_alert_fired`. 퍼널: 설치 → 지도 → 첫 상호작용 30초 목표(PRD 지표와 1:1 대응).

## 9. 다음 단계

1. `npx create-expo-app` + 위 구조 스캐폴딩 (코드 스타터, 프롬프트 #7)
2. Supabase 프로젝트 생성 + PostGIS 스키마 마이그레이션 (백엔드, 프롬프트 #5)
3. UX 화면별 상세 설계 (프롬프트 #3) → 디자인 시스템 (프롬프트 #6)
