import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";
import type { Activity } from "@/theme/tokens";

export type CheckInStatus = "scheduled" | "active" | "completed" | "overdue" | "alerted";

export type CheckInRecord = {
  id: string;
  activity: Activity;
  title: string | null;
  locationName: string | null;
  tags: string[];
  scheduledStartAt: string;
  startedAt: string;
  expectedEndAt: string;
  completedAt: string | null;
  status: CheckInStatus;
};

/** 내 아웃도어 체크인 기록 (최신순, 나만 볼 수 있음 — RLS) */
export function useMyCheckIns() {
  const session = useSessionStore((s) => s.session);
  return useQuery({
    queryKey: ["my-check-ins", session?.user.id ?? "demo"],
    queryFn: async (): Promise<CheckInRecord[]> => {
      if (!supabase || !session) return []; // 데모 모드: 기록 없음

      const { data, error } = await supabase
        .from("check_ins")
        .select(
          "id, activity, title, location_name, tags, scheduled_start_at, started_at, expected_end_at, completed_at, status",
        )
        .order("scheduled_start_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        id: row.id,
        activity: row.activity,
        title: row.title,
        locationName: row.location_name,
        tags: row.tags ?? [],
        scheduledStartAt: row.scheduled_start_at,
        startedAt: row.started_at,
        expectedEndAt: row.expected_end_at,
        completedAt: row.completed_at,
        status: row.status,
      }));
    },
  });
}
