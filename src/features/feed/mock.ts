import type { Post } from "./types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const hoursLater = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

/** 데모 모드용 목 데이터 (용평리조트 주변) */
const INITIAL_POSTS: Post[] = [
  {
    id: "mock-1",
    authorId: "u1",
    nickname: "파우더준호",
    avatarUrl: null,
    body: "레인보우 상단 설질 최고. 오전에 꼭 타세요 🎿",
    imageUrl: null,
    tags: ["설질좋음", "레인보우"],
    activity: "ski",
    lat: 37.645,
    lng: 128.684,
    distanceM: 420,
    createdAt: hoursAgo(1),
    expiresAt: hoursLater(23),
    helpfulCount: 5,
    iHelped: false,
    visibility: "public",
  },
  {
    id: "mock-2",
    authorId: "u2",
    nickname: "산타는수진",
    avatarUrl: null,
    body: "발왕산 등산로 초입 결빙 구간 있어요. 아이젠 필수!",
    imageUrl: null,
    tags: ["결빙주의", "장비필수"],
    activity: "hiking",
    lat: 37.632,
    lng: 128.673,
    distanceM: 1350,
    createdAt: hoursAgo(3),
    expiresAt: hoursLater(21),
    helpfulCount: 12,
    iHelped: true,
    visibility: "public",
  },
  {
    id: "mock-3",
    authorId: "u3",
    nickname: "크루민재",
    avatarUrl: null,
    body: "오후 2시 골드 정상에서 백컨트리 크루 모입니다. 초보 환영",
    imageUrl: null,
    tags: ["크루모집", "초보환영"],
    activity: "backcountry",
    lat: 37.649,
    lng: 128.69,
    distanceM: 890,
    createdAt: hoursAgo(0.5),
    expiresAt: hoursLater(23.5),
    helpfulCount: 2,
    iHelped: false,
    visibility: "public",
  },
];

// 데모 모드 로컬 상태 — 작성한 포스트는 앱 재시작 시 사라진다.
let posts: Post[] = [...INITIAL_POSTS];

export const getMockPosts = (): Post[] => [...posts];

export function addMockPost(input: {
  body: string;
  tags: string[];
  activity: Post["activity"];
  lat: number;
  lng: number;
  imageUri?: string | null;
  visibility?: Post["visibility"];
}): void {
  const { imageUri, visibility, ...rest } = input;
  posts = [
    {
      id: `mock-${Date.now()}`,
      authorId: "me",
      nickname: "나",
      avatarUrl: null,
      imageUrl: imageUri ?? null, // 데모: 로컬 사진 경로 그대로 표시
      distanceM: 0,
      createdAt: new Date().toISOString(),
      expiresAt: hoursLater(24),
      helpfulCount: 0,
      iHelped: false,
      visibility: visibility ?? "public",
      ...rest,
    },
    ...posts,
  ];
}

export function toggleMockHelpful(postId: string): void {
  posts = posts.map((p) =>
    p.id === postId
      ? { ...p, iHelped: !p.iHelped, helpfulCount: p.helpfulCount + (p.iHelped ? -1 : 1) }
      : p,
  );
}

export function deleteMockPost(postId: string): void {
  posts = posts.filter((p) => p.id !== postId);
}
