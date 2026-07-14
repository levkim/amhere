// 채팅 활동 초대 — 공유 가능 활동 목록 + 초대 메시지 인코딩 + 카드용 단건 조회
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";
import type { Activity } from "@/theme/tokens";

/** 활동 초대 메시지 본문 포맷: [activity:<postId>] */
const PREFIX = "[activity:";
export function formatActivityInvite(postId: string): string {
  return `${PREFIX}${postId}]`;
}
export function parseActivityInvite(body: string): string | null {
  if (!body.startsWith(PREFIX) || !body.endsWith("]")) return null;
  const id = body.slice(PREFIX.length, -1);
  return id.length > 0 ? id : null;
}

export type ShareableActivity = {
  postId: string;
  checkInId: string;
  title: string;
  placeName: string | null;
  activity: Activity | null;
  status: "scheduled" | "active";
  scheduledStartAt: string | null;
};

/** 내가 공유할 수 있는 활동 (내가 호스트 + 참가 수락된 활동, 예정/진행중) */
export function useMyShareableActivities() {
  const session = useSessionStore((s) => s.session);
  return useQuery({
    queryKey: ["shareable-activities", session?.user.id ?? "demo"],
    queryFn: async (): Promise<ShareableActivity[]> => {
      if (!supabase || !session) return [];
      const { data, error } = await supabase.rpc("my_shareable_activities");
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: any) => ({
        postId: r.post_id,
        checkInId: r.check_in_id,
        title: r.title ?? "아웃도어 활동",
        placeName: r.place_name ?? null,
        activity: r.activity ?? null,
        status: r.status === "active" ? "active" : "scheduled",
        scheduledStartAt: r.scheduled_start_at ?? null,
      }));
    },
  });
}

export type InviteCard = {
  postId: string;
  title: string;
  placeName: string | null;
  activity: Activity | null;
  status: string | null; // scheduled/active/completed/…
  scheduledStartAt: string | null;
};

/** 초대 카드 1건 — 현재 상태를 실시간으로 반영 (종료되면 status=completed) */
export function useActivityCard(postId: string) {
  return useQuery({
    queryKey: ["activity-card", postId],
    enabled: !!postId,
    staleTime: 30_000,
    queryFn: async (): Promise<InviteCard | null> => {
      if (!supabase) return null;
      const { data, error } = await supabase.rpc("post_detail", { pid: postId });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return {
        postId: row.id,
        title: row.checkin_title || row.body?.slice(0, 40) || "아웃도어 활동",
        placeName: row.checkin_location ?? row.place_name ?? null,
        activity: row.activity ?? null,
        status: row.checkin_status ?? null,
        scheduledStartAt: row.scheduled_start_at ?? null,
      };
    },
  });
}
