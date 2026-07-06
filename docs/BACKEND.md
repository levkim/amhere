# Amhere — 백엔드 설계 (Supabase)

> 버전 0.1 · 2026-07-06 · 구현: [migrations/00001_initial_schema.sql](../supabase/migrations/00001_initial_schema.sql), [functions/safety-sweep](../supabase/functions/safety-sweep/index.ts)

## 1. 아키텍처 한눈에

```
앱 (Expo) ──── supabase-js ────► Supabase
                                  ├── Auth        전화번호 OTP
                                  ├── Postgres    스키마 + PostGIS + RLS
                                  ├── Realtime    posts / messages / buddy_requests 구독
                                  ├── Storage     피드 이미지
                                  └── Edge Fn     safety-sweep (5분 cron)
```

원칙: **비즈니스 규칙은 DB에**(RLS + security definer RPC), 클라이언트는 신뢰하지 않는다.

## 2. DB 스키마

| 테이블 | 역할 | 핵심 설계 |
|---|---|---|
| `profiles` | 사용자 프로필 | auth.users 1:1, 가입 트리거로 자동 생성. `privacy` 3단계(precise/approximate/ghost, 기본 approximate) |
| `user_locations` | 실시간 위치 | **사용자당 1행 upsert** (이력 저장 안 함 — 프라이버시 + 저장 비용). GIST 인덱스 |
| `posts` | 위치 귀속 피드 | `expires_at` 기본 24h. RLS가 만료분을 조회에서 제외 |
| `buddy_requests` | 매칭 요청 | pending → accepted/declined. 수락 = 채팅 개설 |
| `messages` | 1:1 채팅 | 수락된 요청 당사자만 읽기/쓰기 (RLS) |
| `emergency_contacts` / `check_ins` | 안전 체크인 | 본인만 접근. 초과 판정은 서버(sweep)가 수행 |
| `badges` / `user_badges` | 게이미피케이션 | 부여는 서버 로직만(클라이언트 insert 정책 없음) |
| `blocks` / `reports` | 신뢰·안전 | 차단은 피드/매칭/주변사용자 쿼리 전체에 반영 |

## 3. 위치 프라이버시 모델 (가장 중요한 보안 설계)

- `user_locations`에는 **SELECT 정책이 없다** → 클라이언트가 원좌표를 직접 읽을 방법이 없음.
- 조회는 `nearby_users()` RPC(security definer)로만:
  - `ghost` → 결과에서 제외
  - `approximate` → ~500m 그리드로 좌표 스냅
  - `precise` → **수락된 버디에게만** 원좌표, 그 외에는 스냅 좌표
  - 2시간 이상 미갱신 위치는 노출 안 함 (퇴근 후 집 위치 노출 방지)

## 4. API 표면 (클라이언트가 호출하는 것)

| 호출 | 방식 | 비고 |
|---|---|---|
| `upsert_my_location(lat,lng,acc,act)` | RPC | 활성 체크인의 `last_location`도 함께 갱신 |
| `nearby_posts(lat,lng,radius)` | RPC | 거리순 100건, 차단·만료 제외 |
| `nearby_users(lat,lng,radius)` | RPC | §3 프라이버시 강제 |
| posts / buddy_requests / messages CRUD | PostgREST | RLS가 권한 통제 |
| posts, messages, buddy_requests 구독 | Realtime | 피드 갱신 ≤ 5초 목표 |
| 이미지 업로드 | Storage `post-images` 버킷 | 업로드 전 클라이언트 리사이즈(긴 변 1600px) |

## 5. 인증 & 역할

- **전화번호 OTP** (Supabase Auth + SMS 프로바이더). 익명 가입 없음 — 안전 기능의 신뢰 기반.
- 역할: `authenticated` 단일 + RLS. 관리자는 별도 앱 없이 Supabase Studio 사용(MVP). v1에서 `admin` 클레임 기반 신고 처리 대시보드.

## 6. 알림

| 트리거 | 채널 | 시점 |
|---|---|---|
| 버디 요청/수락, 새 메시지 | Expo Push | 즉시 (DB webhook → Edge Fn, v0은 클라이언트 폴링 허용) |
| 체크아웃 15분 초과 | Push(본인) → SMS(비상연락처, v1) | safety-sweep 5분 주기 |
| 주변 새 포스트 다이제스트 | Push | v1 |

## 7. 스토리지 정책

- `post-images` 버킷: authenticated 업로드(본인 경로 `{uid}/...`만), public 읽기. 만료 포스트 이미지는 주간 배치로 정리.
- `avatars` 버킷: 동일 패턴.

## 8. 결제 (v2 대비 메모)

- 가이드 투어/구독은 **RevenueCat + 앱스토어 IAP**로 시작(외부 PG는 앱스토어 정책 리스크). 스키마는 v2에서 추가 — 지금 만들지 않는다.

## 9. 레이트 리밋 & 어뷰즈 방어

- 위치 upsert: 클라이언트에서 활동 모드별 5–30초 간격 제한 + Supabase API rate limit.
- 포스트: 사용자당 10건/시간 (v0은 클라이언트 제한, v1에서 DB 트리거로 강제).
- OTP: Supabase Auth 기본 제한 사용.
- 신고 N회 누적 시 자동 숨김(v1 트리거).

## 10. 보안 리스크 체크리스트

| 리스크 | 대응 |
|---|---|
| 위치 데이터 유출/스토킹 | §3 모델. 원좌표는 RPC 밖으로 절대 안 나감. 기본값 approximate |
| RPC가 security definer라 RLS 우회 | RPC 내부에서 auth.uid() 기반 차단/프라이버시 필터를 직접 구현(완료) |
| service_role 키 유출 | Edge Function 환경변수에만 존재. 앱 번들에는 anon 키만 |
| 만료 포스트 잔존 | RLS로 즉시 비노출 + 주간 삭제 배치 |
| 체크인 알림 오발송 | 15분 유예 + active→alerted 조건부 갱신으로 중복 방지 |
| 미성년자/신원 | 전화번호 인증 필수, 약관에 연령 고지 (법무 검토 필요) |

## 11. 셋업 순서

1. [supabase.com](https://supabase.com)에서 프로젝트 생성 (리전: `ap-northeast-2` 서울)
2. `npx supabase link --project-ref <ref>` → `npx supabase db push` (마이그레이션 적용)
3. Auth > Providers > Phone 활성화 + SMS 프로바이더 연결 (개발 중엔 테스트 OTP 사용 가능)
4. Storage 버킷 `post-images`, `avatars` 생성
5. `npx supabase functions deploy safety-sweep` + Dashboard에서 5분 cron 등록
6. 앱 `.env`에 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` 입력
