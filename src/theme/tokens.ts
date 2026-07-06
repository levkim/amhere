// Amhere 디자인 토큰 — 어두운 아웃도어 팔레트
// 화면에서 색·간격을 하드코딩하지 말고 반드시 이 토큰을 사용한다.

export const colors = {
  bg: "#0F1B2D",
  surface: "#16263D",
  surfaceHigh: "#1E3251",
  border: "#2A3F5E",

  primary: "#2E90FA",
  primaryPressed: "#1570CD",
  accent: "#34D399",
  warn: "#F59E0B",
  danger: "#EF4444",

  text: "#F1F5F9",
  subtext: "#94A3B8",
  invert: "#0F1B2D",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
} as const;

export const typography = {
  title: { fontSize: 24, fontWeight: "700" as const },
  heading: { fontSize: 18, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  caption: { fontSize: 12, fontWeight: "400" as const },
} as const;

export const ACTIVITY_LABELS = {
  ski: "스키",
  snowboard: "스노보드",
  backcountry: "백컨트리",
  hiking: "하이킹",
  trekking: "트레킹",
  running: "러닝",
} as const;

export type Activity = keyof typeof ACTIVITY_LABELS;
