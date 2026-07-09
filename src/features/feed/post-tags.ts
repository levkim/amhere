import type { Activity } from "@/theme/tokens";

// 활동별 추천 태그. 선택한 활동에 맞는 태그 + 공통 태그를 함께 노출한다.
const BY_ACTIVITY: Record<Activity, string[]> = {
  ski: ["설질좋음", "파우더", "빙판주의", "슬로프혼잡", "리프트대기짧음", "야간개장"],
  snowboard: ["설질좋음", "파우더", "빙판주의", "슬로프혼잡", "리프트대기짧음", "야간개장"],
  backcountry: ["파우더", "사면안정", "눈사태주의", "러셀필요", "스킨트랙있음"],
  hiking: ["단풍", "조망좋음", "결빙주의", "진흙탕", "물있음", "화장실있음"],
  trekking: ["단풍", "조망좋음", "결빙주의", "진흙탕", "물있음", "화장실있음"],
  running: ["노면좋음", "야간러닝", "급수있음", "페이스러너"],
  mtb: ["다운힐", "업힐구간", "자갈길", "노면좋음", "정비소근처"],
  cycling: ["다운힐", "업힐구간", "자갈길", "노면좋음", "정비소근처"],
};

const COMMON = ["크루모집", "초보환영", "뷰맛집", "혼잡", "주차정보", "날씨좋음"];

/** 활동 + 이미 선택한 태그를 합쳐 중복 없이 반환 (선택 태그가 사라지지 않게) */
export function tagsForActivity(activity: Activity, selected: string[]): string[] {
  const set = new Set<string>([...BY_ACTIVITY[activity], ...COMMON, ...selected]);
  return [...set];
}
