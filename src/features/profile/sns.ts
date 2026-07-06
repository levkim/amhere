// SNS 아웃링크: 핸들(@user)이든 전체 URL이든 입력받아 올바른 링크로 변환

export type SnsPlatform = "instagram" | "facebook" | "threads" | "tiktok";

export type SnsLinks = Partial<Record<SnsPlatform, string>>;

export const SNS_PLATFORMS: { key: SnsPlatform; label: string; emoji: string; placeholder: string }[] = [
  { key: "instagram", label: "인스타그램", emoji: "📸", placeholder: "@아이디 또는 주소" },
  { key: "facebook", label: "페이스북", emoji: "👥", placeholder: "아이디 또는 주소" },
  { key: "threads", label: "쓰레드", emoji: "🧵", placeholder: "@아이디 또는 주소" },
  { key: "tiktok", label: "틱톡", emoji: "🎵", placeholder: "@아이디 또는 주소" },
];

const BASE_URLS: Record<SnsPlatform, (handle: string) => string> = {
  instagram: (h) => `https://instagram.com/${h}`,
  facebook: (h) => `https://facebook.com/${h}`,
  threads: (h) => `https://threads.net/@${h}`,
  tiktok: (h) => `https://tiktok.com/@${h}`,
};

/** 입력값(핸들/URL)을 열 수 있는 URL로 변환. 빈 값이면 null */
export function toSnsUrl(platform: SnsPlatform, value: string | undefined | null): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v; // 이미 전체 URL
  const handle = v.replace(/^@/, "");
  return BASE_URLS[platform](handle);
}
