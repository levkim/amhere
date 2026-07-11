// Sentry 크래시 리포팅 초기화.
// DSN은 EXPO_PUBLIC_SENTRY_DSN 환경변수로 주입한다. 없으면 조용히 비활성화되어
// 로컬/데모 환경에서 아무 영향도 주지 않는다.
import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!dsn) return; // DSN 미설정 시 비활성 — 개발/데모에 지장 없음
  Sentry.init({
    dsn,
    // 프로덕션 릴리스에서만 이벤트 전송 (개발 중 잡음 방지)
    enabled: !__DEV__,
    // 성능 트레이스는 소량만 샘플링 (비용 관리)
    tracesSampleRate: 0.1,
    // 사용자 위치·좌표 등 민감 정보가 브레드크럼에 실리지 않도록 최소화
    sendDefaultPii: false,
  });
}

// 루트 컴포넌트를 감싸 라우팅·렌더 오류까지 자동 캡처
export const wrapWithSentry = dsn ? Sentry.wrap : <T,>(c: T) => c;

export { Sentry };
