// 활동 라이브 위치 — 멤버들의 실시간 좌표·경로 꼬리 조회 + 실시간 구독
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";
import { isSharing, startLiveShare, stopLiveShare } from "@/features/tracking/live";

/** 채팅에서 라이브 맵 카드로 렌더링되는 특수 메시지 본문 */
export const LIVEMAP_MSG = "[livemap]";

export type LiveMember = {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  lat: number;
  lng: number;
  trail: { lat: number; lng: number; t: number }[];
  updatedAt: string;
};

export function useLiveLocations(checkInId: string) {
  const query = useQuery({
    queryKey: ["live-locations", checkInId],
    enabled: !!checkInId,
    refetchInterval: 20_000, // 실시간 구독 실패 대비 폴백
    queryFn: async (): Promise<LiveMember[]> => {
      if (!supabase || !checkInId) return [];
      const { data, error } = await supabase
        .from("live_locations")
        .select("user_id, lat, lng, trail, updated_at, profiles!user_id(nickname, avatar_url)")
        .eq("check_in_id", checkInId);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: any) => ({
        userId: r.user_id,
        nickname: r.profiles?.nickname ?? "회원",
        avatarUrl: r.profiles?.avatar_url ?? null,
        lat: r.lat,
        lng: r.lng,
        trail: Array.isArray(r.trail) ? r.trail : [],
        updatedAt: r.updated_at,
      }));
    },
  });

  // 실시간 구독 — 인스턴스별 고유 토픽 (동시 구독 충돌 방지)
  const topicId = useRef(`live:${checkInId}:${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    if (!supabase || !checkInId) return;
    const channel = supabase
      .channel(topicId.current)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_locations",
          filter: `check_in_id=eq.${checkInId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["live-locations", checkInId] }),
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [checkInId]);

  return query;
}

/** 내 위치 공유 토글 상태 + 시작/중단 */
export function useMyLiveShare(checkInId: string) {
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    isSharing(checkInId).then(setSharing);
  }, [checkInId]);

  const toggle = async (): Promise<boolean | "denied"> => {
    setBusy(true);
    try {
      if (sharing) {
        await stopLiveShare(checkInId);
        setSharing(false);
        queryClient.invalidateQueries({ queryKey: ["live-locations", checkInId] });
        return false;
      }
      const ok = await startLiveShare(checkInId);
      if (!ok) return "denied";
      setSharing(true);
      queryClient.invalidateQueries({ queryKey: ["live-locations", checkInId] });
      return true;
    } finally {
      setBusy(false);
    }
  };

  return { sharing, busy, toggle };
}
