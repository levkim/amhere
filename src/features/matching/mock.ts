import type { BuddyRequest, BuddyStatus, NearbyUser } from "./types";
import type { Activity } from "@/theme/tokens";

// 데모 모드 로컬 상태 — 앱 재시작 시 초기화된다.

let requests: BuddyRequest[] = [
  {
    id: "mock-r1",
    requesterId: "u1",
    requesterNickname: "파우더준호",
    addresseeId: "me",
    addresseeNickname: "나",
    activity: "backcountry",
    plannedDate: new Date().toISOString().slice(0, 10),
    region: "용평·발왕산",
    message: "내일 오전 백컨트리 같이 가실래요? 저 3시즌차입니다.",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
];

export const getMockRequests = (): BuddyRequest[] => [...requests];

export function addMockRequest(input: {
  addresseeId: string;
  addresseeNickname: string;
  activity: Activity;
  plannedDate: string;
  region: string;
  message: string | null;
}): void {
  requests = [
    {
      id: `mock-${Date.now()}`,
      requesterId: "me",
      requesterNickname: "나",
      status: "pending",
      createdAt: new Date().toISOString(),
      ...input,
    },
    ...requests,
  ];
}

export function setMockRequestStatus(id: string, status: BuddyStatus): void {
  requests = requests.map((r) => (r.id === id ? { ...r, status } : r));
}

export function deleteMockRequest(id: string): void {
  requests = requests.filter((r) => r.id !== id);
}

// 데모 좌표: 용평리조트 주변에 가상 위치를 흩어 배치
export const MOCK_NEARBY_USERS: NearbyUser[] = [
  {
    userId: "u1",
    nickname: "파우더준호",
    avatarUrl: null,
    activity: "ski",
    level: 3,
    lat: 37.648,
    lng: 128.688,
    isFriend: true,
  },
  {
    userId: "u2",
    nickname: "산타는수진",
    avatarUrl: null,
    activity: "hiking",
    level: 2,
    lat: 37.62,
    lng: 128.66,
    isFriend: false,
  },
  {
    userId: "u3",
    nickname: "크루민재",
    avatarUrl: null,
    activity: "backcountry",
    level: 5,
    lat: 37.66,
    lng: 128.7,
    isFriend: false,
  },
];

// 데모 채팅: requestId별 메시지
const demoMessages = new Map<string, { id: string; senderId: string; body: string; createdAt: string }[]>();

export function getMockMessages(requestId: string) {
  if (!demoMessages.has(requestId)) {
    demoMessages.set(requestId, [
      {
        id: "m1",
        senderId: "u1",
        body: "매칭 감사해요! 몇 시에 어디서 볼까요?",
        createdAt: new Date().toISOString(),
      },
    ]);
  }
  return [...demoMessages.get(requestId)!];
}

export function addMockMessage(requestId: string, body: string) {
  const list = demoMessages.get(requestId) ?? [];
  demoMessages.set(requestId, [
    ...list,
    { id: `m-${Date.now()}`, senderId: "me", body, createdAt: new Date().toISOString() },
  ]);
}
