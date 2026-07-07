// Amhere 디자인 토큰 — "Alpine Premium" (해질녘 산의 시네마틱 다크)
// 화면에서 색·간격을 하드코딩하지 말고 반드시 이 토큰을 사용한다.

export const colors = {
  // 층이 느껴지는 시네마틱 다크
  bg: "#0B1120",
  bgElevated: "#0E1626",
  surface: "#131C2E",
  surfaceHigh: "#1C2840",
  surfaceHigher: "#243350",
  border: "#26324B",
  borderStrong: "#33425F",

  // 신뢰의 블루
  primary: "#3B82F6",
  primaryPressed: "#2563EB",

  // 자연·안전의 알파인 틸그린
  accent: "#2DD4A7",
  accentSoft: "rgba(45, 212, 167, 0.14)",

  // 활력·경보의 앰버 / 위험의 코랄레드
  amber: "#FBBF24",
  warn: "#FBBF24",
  danger: "#F87171",
  dangerSoft: "rgba(248, 113, 113, 0.14)",

  text: "#F8FAFC",
  subtext: "#94A3B8",
  muted: "#64748B",
  invert: "#0B1120",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

// 굵고 큰 위계 (Strava급) + 카운트다운용 초대형
export const typography = {
  hero: { fontSize: 44, fontWeight: "800" as const, letterSpacing: -1 },
  display: { fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.3 },
  heading: { fontSize: 18, fontWeight: "700" as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: "400" as const },
  caption: { fontSize: 12, fontWeight: "500" as const },
} as const;

// 부드러운 그림자(입체감) — iOS/Android 공통
export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  float: {
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

export const ACTIVITY_LABELS = {
  ski: "스키장",
  snowboard: "프리라이딩",
  backcountry: "백컨트리 스키/보딩",
  hiking: "하이킹",
  trekking: "트레킹",
  running: "러닝",
  mtb: "MTB",
  cycling: "싸이클",
} as const;

export type Activity = keyof typeof ACTIVITY_LABELS;
