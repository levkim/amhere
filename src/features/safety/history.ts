import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";
import type { Activity } from "@/theme/tokens";

export type CheckInStatus = "scheduled" | "active" | "completed" | "overdue" | "alerted";

export type TrackPoint = { lat: number; lng: number; t: number };

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
  track: TrackPoint[];
  trackDistanceM: number;
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
          "id, activity, title, location_name, tags, scheduled_start_at, started_at, expected_end_at, completed_at, status, track, track_distance_m",
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
        track: Array.isArray(row.track) ? (row.track as TrackPoint[]) : [],
        trackDistanceM: row.track_distance_m ?? 0,
      }));
    },
  });
}

/** 단일 체크인 기록 (활동 상세 화면용) */
export function useCheckIn(id: string | undefined) {
  const session = useSessionStore((s) => s.session);
  return useQuery({
    queryKey: ["check-in", id],
    enabled: !!id,
    queryFn: async (): Promise<CheckInRecord | null> => {
      if (!supabase || !session || !id) return null;
      const { data, error } = await supabase
        .from("check_ins")
        .select(
          "id, activity, title, location_name, tags, scheduled_start_at, started_at, expected_end_at, completed_at, status, track, track_distance_m",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        id: data.id,
        activity: data.activity,
        title: data.title,
        locationName: data.location_name,
        tags: data.tags ?? [],
        scheduledStartAt: data.scheduled_start_at,
        startedAt: data.started_at,
        expectedEndAt: data.expected_end_at,
        completedAt: data.completed_at,
        status: data.status,
        track: Array.isArray(data.track) ? (data.track as TrackPoint[]) : [],
        trackDistanceM: data.track_distance_m ?? 0,
      };
    },
  });
}
