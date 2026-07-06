import type { Activity } from "@/theme/tokens";

export type Post = {
  id: string;
  authorId: string;
  nickname: string;
  avatarUrl: string | null;
  body: string;
  imageUrl: string | null;
  tags: string[];
  activity: Activity | null;
  lat: number;
  lng: number;
  distanceM: number;
  createdAt: string;
  expiresAt: string;
};

export type NewPost = {
  body: string;
  tags: string[];
  activity: Activity;
  lat: number;
  lng: number;
};
