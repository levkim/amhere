// 아웃도어 체크인용 "나의 활동 태그"
// 이모지는 선택 UI에서만 보여주고, 저장/피드 노출은 라벨만 사용한다 (#동행구함 형태).

export type CheckinTag = {
  label: string;
  emoji: string;
};

export const CHECKIN_TAGS: CheckinTag[] = [
  { label: "동행구함", emoji: "🤝" },
  { label: "혼자서", emoji: "🧘" },
  { label: "초보에요", emoji: "🌱" },
  { label: "베테랑", emoji: "🏆" },
  { label: "길치에요", emoji: "🧭" },
  { label: "첫방문", emoji: "📍" },
  { label: "천천히가요", emoji: "🐢" },
  { label: "빠른페이스", emoji: "⚡" },
  { label: "가이드해드려요", emoji: "🗺️" },
  { label: "반려견동반", emoji: "🐕" },
  { label: "사진부탁해요", emoji: "📸" },
  { label: "커피한잔환영", emoji: "☕" },
  { label: "조용히즐겨요", emoji: "🤫" },
];
