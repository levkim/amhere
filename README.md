# Amhere (여기있어) 🏔️

아웃도어 활동자(스키/보드, 백컨트리, 하이킹, 트레킹, 러닝)를 위한 **위치 기반 실시간 커뮤니티 앱**.
"지금, 여기, 나와 같은 사람"을 지도 위에서 보여준다.

## 문서

| 문서 | 내용 |
|---|---|
| [docs/PRD.md](docs/PRD.md) | 제품 정의: 페르소나, MVP 범위, 성공 지표, 로드맵 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 앱 구조: 스택, 폴더, 상태 관리, API 레이어 규칙 |
| [docs/BACKEND.md](docs/BACKEND.md) | Supabase 설계: 스키마, RLS, 위치 프라이버시 모델, 셋업 순서 |

## 실행

```bash
npm install
npx expo start
```

Expo Go 앱(iOS/Android)으로 QR을 스캔하면 바로 실행됩니다.
**`.env` 없이 실행하면 데모 모드**(목 데이터)로 동작합니다.

### 실제 백엔드 연결

1. [docs/BACKEND.md](docs/BACKEND.md) §11 셋업 순서대로 Supabase 프로젝트 생성 + 마이그레이션 적용
2. `.env.example`을 `.env`로 복사하고 URL/anon key 입력
3. 재시작하면 전화번호 로그인이 활성화됩니다

## 스택

- **Expo SDK 57** (React Native, TypeScript) + Expo Router
- **Supabase** — Auth(전화 OTP), Postgres+PostGIS, Realtime, Storage
- **TanStack Query** (서버 상태) + **Zustand** (클라이언트 상태)
- **EAS Build** — Windows에서 iOS 빌드 (Mac 불필요)

## 폴더 구조 (요약)

```
src/
├── app/          # 화면 = 라우트 (Expo Router). 로직 없이 조립만
├── components/   # 공용 UI (theme/tokens.ts의 토큰만 사용)
├── features/     # 도메인 로직: feed / matching / safety / location
├── lib/          # supabase, query-client
├── stores/       # Zustand: session, location
└── theme/        # 디자인 토큰
supabase/
├── migrations/   # DB 스키마 (PostGIS + RLS)
└── functions/    # safety-sweep (체크아웃 초과 판정 cron)
```

## 다음 마일스톤

- [ ] Mapbox 지도 활성화 — `@rnmapbox/maps` 설치 + EAS dev build (Expo Go에서는 동작 안 함)
- [ ] 포스트 작성 화면 (사진 업로드 포함)
- [ ] 버디 요청 보내기/수락 플로우 + 채팅
- [ ] 백그라운드 위치 (안전 체크인 활성 시에만) + 비상연락처 SMS
- [ ] EAS Build 셋업 (`eas build:configure`) 후 실기기 빌드
