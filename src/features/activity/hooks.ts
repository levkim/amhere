import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";
import {
  applyToActivity,
  cancelMyApplication,
  fetchActivityMessages,
  fetchMyBuddies,
  fetchParticipants,
  respondParticipant,
  sendActivityMessage,
} from "./api";

export function useMyBuddies() {
  return useQuery({ queryKey: ["my-buddies"], queryFn: fetchMyBuddies });
}

export function useParticipants(checkInId: string) {
  const query = useQuery({
    queryKey: ["participants", checkInId],
    queryFn: () => fetchParticipants(checkInId),
    enabled: !!checkInId,
  });

  // 채널 토픽을 인스턴스마다 고유하게 — 같은 checkInId를 여러 컴포넌트가 동시에
  // 구독할 때 토픽이 충돌해 "add callbacks after subscribe()" 오류가 나는 것을 막는다.
  const topicId = useRef(`participants:${checkInId}:${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!supabase || !checkInId) return;
    const channel = supabase
      .channel(topicId.current)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_participants",
          filter: `check_in_id=eq.${checkInId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["participants", checkInId] }),
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [checkInId]);

  return query;
}

export function useApplyToActivity() {
  return useMutation({
    mutationFn: (checkInId: string) => applyToActivity(checkInId),
    onSuccess: (_d, checkInId) => {
      queryClient.invalidateQueries({ queryKey: ["participants", checkInId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useCancelApplication() {
  return useMutation({
    mutationFn: (checkInId: string) => cancelMyApplication(checkInId),
    onSuccess: (_d, checkInId) => {
      queryClient.invalidateQueries({ queryKey: ["participants", checkInId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useRespondParticipant(checkInId: string) {
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "declined" }) =>
      respondParticipant(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["participants", checkInId] }),
  });
}

export function useActivityMessages(checkInId: string) {
  const query = useQuery({
    queryKey: ["activity-messages", checkInId],
    queryFn: () => fetchActivityMessages(checkInId),
    enabled: !!checkInId,
  });

  const topicId = useRef(`activity-messages:${checkInId}:${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!supabase || !checkInId) return;
    const channel = supabase
      .channel(topicId.current)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_messages",
          filter: `check_in_id=eq.${checkInId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["activity-messages", checkInId] }),
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [checkInId]);

  return query;
}

export function useSendActivityMessage(checkInId: string) {
  return useMutation({
    mutationFn: (body: string) => sendActivityMessage(checkInId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["activity-messages", checkInId] }),
  });
}
