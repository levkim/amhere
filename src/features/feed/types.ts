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
  /** "도움됐어요" 수 */
  helpfulCount: number;
  /** 내가 도움됐어요를 눌렀는지 */
  iHelped: boolean;
  /** 공개 범위 */
  visibility: PostVisibility;
  /** 연결된 아웃도어 체크인 (참가신청 대상). 없으면 null */
  checkInId: string | null;
  /** 수락된 참가자 수 */
  joinedCount: number;
  /** 위치 추가로 지정한 장소명. 없으면 null */
  placeName: string | null;
};

/** 공개 범위: 전체 공개 / 친구에게만 (비공개는 포스트 자체를 안 만듦) */
export type PostVisibility = "public" | "friends";

export type NewPost = {
  body: string;
  tags: string[];
  activity: Activity;
  lat: number;
  lng: number;
  /** 폰에서 고른 사진의 로컬 경로 (업로드 전) */
  imageUri?: string | null;
  /** 공개 범위 (기본 전체 공개) */
  visibility?: PostVisibility;
  /** 연결할 체크인 id (참가신청 대상) */
  checkInId?: string | null;
  /** 위치 추가 장소명 (선택) */
  placeName?: string | null;
  /** 크루 활동으로 공유 시 크루 id (선택) */
  crewId?: string | null;
};
