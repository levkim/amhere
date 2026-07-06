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
  activity: Activity | null;
  level: number;
  distanceM: number | null;
  isApproximate: boolean;
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
