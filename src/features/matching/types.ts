import type { Activity } from "@/theme/tokens";

export type BuddyStatus = "pending" | "accepted" | "declined" | "cancelled";

export type BuddyRequest = {
  id: string;
  requesterId: string;
  requesterNickname: string;
  addresseeId: string;
  addresseeNickname: string;
  activity: Activity;
  plannedDate: string; // YYYY-MM-DD
  region: string;
  message: string | null;
  status: BuddyStatus;
  createdAt: string;
};

export type NearbyUser = {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  activity: Activity | null;
  level: number;
  /** 서버에서 가상화된 위치 (친구·20km 이내면 500m, 아니면 10km 반경 내 가상 좌표) */
  lat: number;
  lng: number;
  /** 친구이면서 20km 이내 → 더 정확한 500m 표시 */
  isFriend: boolean;
};

export type NewBuddyRequest = {
  addresseeId: string;
  addresseeNickname: string;
  activity: Activity;
  plannedDate: string;
  region: string;
  message: string | null;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};
