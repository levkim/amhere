import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";

export type InboxItem = {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  readAt: string | null;
};

/** 받은 알림 목록 (최신순) + 실시간 수신 */
export function useInbox() {
  const session = useSessionStore((s) => s.session);

  const query = useQuery({
    queryKey: ["inbox", session?.user.id ?? "demo"],
    queryFn: async (): Promise<InboxItem[]> => {
      if (!supabase || !session) return []; // 데모 모드
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, created_at, read_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        createdAt: r.created_at,
        readAt: r.read_at,
      }));
    },
  });

  useEffect(() => {
    if (!supabase || !session) return;
    const channel = supabase
      .channel(`inbox:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["inbox"] }),
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [session]);

  return query;
}

/** 안 읽은 알림 개수 */
export function useUnreadCount(): number {
  const { data } = useInbox();
  return (data ?? []).filter((n) => n.readAt === null).length;
}

/** 전부 읽음 처리 */
export function useMarkAllRead() {
  return useMutation({
    mutationFn: async () => {
      if (!supabase) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox"] }),
  });
}
