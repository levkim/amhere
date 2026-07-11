import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";
import { useEffectiveCoords } from "@/stores/location";
import {
  deleteBuddyRequest,
  fetchMessages,
  fetchMyBuddyRequests,
  fetchNearbyUsers,
  respondToRequest,
  sendBuddyRequest,
  sendMessage,
} from "./api";
import type { BuddyStatus, NewBuddyRequest } from "./types";

/** 데모 모드에서는 "me" */
export function useMyUserId(): string {
  return useSessionStore((s) => s.session?.user.id ?? "me");
}

export function useNearbyUsers() {
  const coords = useEffectiveCoords();
  return useQuery({
    queryKey: ["nearby-users", `${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}`],
    queryFn: () => fetchNearbyUsers(coords),
    refetchInterval: 30_000,
  });
}

export function useMyBuddyRequests() {
  const myId = useMyUserId();
  return useQuery({
    queryKey: ["matches", myId],
    queryFn: fetchMyBuddyRequests,
  });
}

export function useSendBuddyRequest() {
  return useMutation({
    mutationFn: (input: NewBuddyRequest) => sendBuddyRequest(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["matches"] }),
  });
}

export function useRespondToRequest() {
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BuddyStatus }) =>
      respondToRequest(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["matches"] }),
  });
}

/** 거절됨/취소됨 요청 목록에서 삭제 */
export function useDeleteBuddyRequest() {
  return useMutation({
    mutationFn: (id: string) => deleteBuddyRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["matches"] }),
  });
}

export function useMessages(requestId: string) {
  const query = useQuery({
    queryKey: ["messages", requestId],
    queryFn: () => fetchMessages(requestId),
  });

  // Realtime: 새 메시지가 insert되면 캐시 갱신
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel(`messages:${requestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `request_id=eq.${requestId}` },
        () => queryClient.invalidateQueries({ queryKey: ["messages", requestId] }),
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [requestId]);

  return query;
}

export function useSendMessage(requestId: string) {
  return useMutation({
    mutationFn: (body: string) => sendMessage(requestId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", requestId] }),
  });
}
