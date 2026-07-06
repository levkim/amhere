import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";
import type { Activity } from "@/theme/tokens";

export type CheckInStatus = "active" | "completed" | "overdue" | "alerted";

export type CheckInRecord = {
  id: string;
  activity: Activity;
  locationName: string | null;
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
        .select("id, activity, location_name, started_at, expected_end_at, completed_at, status")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        id: row.id,
        activity: row.activity,
        locationName: row.location_name,
        startedAt: row.started_at,
        expectedEndAt: row.expected_end_at,
        completedAt: row.completed_at,
        status: row.status,
      }));
    },
  });
}
