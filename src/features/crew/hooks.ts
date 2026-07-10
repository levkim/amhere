import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";
import {
  createCrew,
  fetchCrewMembers,
  fetchCrewMessages,
  fetchCrewPosts,
  fetchCrews,
  fetchMyJoinedCrews,
  joinCrew,
  leaveCrew,
  respondCrewMember,
  sendCrewMessage,
  type JoinMode,
} from "./api";

export function useCrews() {
  return useQuery({ queryKey: ["crews"], queryFn: fetchCrews });
}

/** 내가 가입한 크루 (크루 활동 공유 선택기용) */
export function useMyJoinedCrews() {
  return useQuery({ queryKey: ["my-joined-crews"], queryFn: fetchMyJoinedCrews });
}

/** 크루 활동 피드 */
export function useCrewPosts(crewId: string) {
  return useQuery({
    queryKey: ["crew-posts", crewId],
    queryFn: () => fetchCrewPosts(crewId),
    enabled: !!crewId,
  });
}

export function useCrew(crewId: string) {
  const { data: crews } = useCrews();
  return crews?.find((c) => c.id === crewId) ?? null;
}

export function useCrewMembers(crewId: string) {
  const query = useQuery({
    queryKey: ["crew-members", crewId],
    queryFn: () => fetchCrewMembers(crewId),
    enabled: !!crewId,
  });

  useEffect(() => {
    if (!supabase || !crewId) return;
    const channel = supabase
      .channel(`crew-members:${crewId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crew_members", filter: `crew_id=eq.${crewId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["crew-members", crewId] });
          queryClient.invalidateQueries({ queryKey: ["crews"] });
        },
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [crewId]);

  return query;
}

export function useCreateCrew() {
  return useMutation({
    mutationFn: (input: Parameters<typeof createCrew>[0]) => createCrew(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crews"] }),
  });
}

export function useJoinCrew() {
  return useMutation({
    mutationFn: ({ crewId, joinMode }: { crewId: string; joinMode: JoinMode }) =>
      joinCrew(crewId, joinMode),
    onSuccess: (_d, { crewId }) => {
      queryClient.invalidateQueries({ queryKey: ["crews"] });
      queryClient.invalidateQueries({ queryKey: ["crew-members", crewId] });
    },
  });
}

export function useLeaveCrew() {
  return useMutation({
    mutationFn: (crewId: string) => leaveCrew(crewId),
    onSuccess: (_d, crewId) => {
      queryClient.invalidateQueries({ queryKey: ["crews"] });
      queryClient.invalidateQueries({ queryKey: ["crew-members", crewId] });
    },
  });
}

export function useRespondCrewMember(crewId: string) {
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "accepted" | "declined" }) =>
      respondCrewMember(crewId, userId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crew-members", crewId] });
      queryClient.invalidateQueries({ queryKey: ["crews"] });
    },
  });
}

export function useCrewMessages(crewId: string) {
  const query = useQuery({
    queryKey: ["crew-messages", crewId],
    queryFn: () => fetchCrewMessages(crewId),
    enabled: !!crewId,
  });

  useEffect(() => {
    if (!supabase || !crewId) return;
    const channel = supabase
      .channel(`crew-messages:${crewId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "crew_messages", filter: `crew_id=eq.${crewId}` },
        () => queryClient.invalidateQueries({ queryKey: ["crew-messages", crewId] }),
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [crewId]);

  return query;
}

export function useSendCrewMessage(crewId: string) {
  return useMutation({
    mutationFn: (body: string) => sendCrewMessage(crewId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crew-messages", crewId] }),
  });
}
