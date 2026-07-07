import { useEffect } from "react";
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

  useEffect(() => {
    if (!supabase || !checkInId) return;
    const channel = supabase
      .channel(`participants:${checkInId}`)
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

  useEffect(() => {
    if (!supabase || !checkInId) return;
    const channel = supabase
      .channel(`activity-messages:${checkInId}`)
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
