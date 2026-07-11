import { create } from "zustand";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { startTracking, stopTracking, trackDistance, clearTrack } from "@/features/tracking/engine";
import type { Activity } from "@/theme/tokens";

// 아웃도어 체크인 상태 머신:
//   scheduled(예약, 미래 시작) → active(감시 중) → completed
// 초과 판정·비상 알림은 서버가, 클라이언트는 예약/진행 표시 + 로컬 리마인더를 담당한다.

export type CheckInState = "scheduled" | "active";

type ActiveCheckIn = {
  id: string;
  activity: Activity;
  title: string | null;
  locationName: string;
  tags: string[];
  scheduledStartAt: string; // 시작 예약 시각 (바로시작이면 생성 시각)
  expectedEndAt: string;
  state: CheckInState;
  notifIds: string[]; // 취소할 로컬 알림들 (시작 프롬프트 + 종료 리마인더)
  recordTrack: boolean; // 경로 기록 여부
};

type StartInput = {
  activity: Activity;
  title: string | null;
  locationName: string;
  tags: string[];
  scheduledStartAt: Date;
  expectedEndAt: Date;
  contactId: string | null;
  guardianIds: string[]; // 임시 지킴이(버디) user_id들
  recordTrack: boolean;
};

type SafetyState = {
  active: ActiveCheckIn | null;
  hydrate: () => Promise<void>;
  start: (input: StartInput) => Promise<void>;
  confirmStart: () => Promise<void>; // 예약 → 감시 시작
  cancelScheduled: () => Promise<void>; // 예약 취소
  extend: (hours: number) => Promise<void>;
  complete: () => Promise<void>;
};

async function scheduleAt(date: Date, title: string, body: string): Promise<string | null> {
  if (Platform.OS === "web" || date.getTime() <= Date.now()) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: "default" },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  } catch (e) {
    console.warn("notification schedule failed:", e);
    return null;
  }
}

function cancelNotifs(ids: string[]) {
  ids.forEach((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}));
}

/** 예약(미래 시작) 체크인의 로컬 알림 예약: 시작 프롬프트 + 종료 30분 전 리마인더 */
async function scheduleReminders(
  state: CheckInState,
  scheduledStartAt: Date,
  expectedEndAt: Date,
  locationName: string,
): Promise<string[]> {
  const ids: string[] = [];
  if (state === "scheduled") {
    const startId = await scheduleAt(
      scheduledStartAt,
      "출발하셨나요? 🏔️",
      `${locationName || "활동"} 아웃도어 체크인을 시작하려면 앱에서 확인해 주세요.`,
    );
    if (startId) ids.push(startId);
  }
  const remindAt = new Date(expectedEndAt.getTime() - 30 * 60_000);
  const endId = await scheduleAt(
    remindAt,
    "체크아웃 30분 전이에요 ⏰",
    "활동이 끝나면 잊지 말고 체크아웃해 주세요. 늦으면 비상연락처에 알림이 가요.",
  );
  if (endId) ids.push(endId);
  return ids;
}

export const useSafetyStore = create<SafetyState>((set, get) => ({
  active: null,

  // 앱 시작 시 DB에서 예약/진행 중 체크인을 복원 (재시작해도 배너 유지)
  hydrate: async () => {
    if (!supabase) return;
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data, error } = await supabase
      .from("check_ins")
      .select("id, activity, title, location_name, tags, scheduled_start_at, expected_end_at, status")
      .in("status", ["scheduled", "active"])
      .order("scheduled_start_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return;

    set({
      active: {
        id: data.id,
        activity: data.activity,
        title: data.title,
        locationName: data.location_name ?? "",
        tags: data.tags ?? [],
        scheduledStartAt: data.scheduled_start_at,
        expectedEndAt: data.expected_end_at,
        state: data.status === "scheduled" ? "scheduled" : "active",
        notifIds: [], // 복원 시 로컬 알림 id는 알 수 없음 (이미 예약돼 있음)
        recordTrack: false, // 복원 시엔 기록 상태 알 수 없음 (재시작 후 추적은 새 활동부터)
      },
    });
  },

  start: async ({
    activity,
    title,
    locationName,
    tags,
    scheduledStartAt,
    expectedEndAt,
    contactId,
    guardianIds,
    recordTrack,
  }) => {
    const isImmediate = scheduledStartAt.getTime() <= Date.now() + 60_000; // 1분 이내면 바로시작
    const state: CheckInState = isImmediate ? "active" : "scheduled";

    let id = `local-${Date.now()}`;
    if (supabase) {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        const { data, error } = await supabase
          .from("check_ins")
          .insert({
            user_id: user.id,
            activity,
            title,
            location_name: locationName,
            tags,
            contact_id: contactId,
            guardian_ids: guardianIds,
            scheduled_start_at: scheduledStartAt.toISOString(),
            expected_end_at: expectedEndAt.toISOString(),
            status: state,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        id = data.id;

        // 지킴이에게 "지정됨" 알림 (실패해도 체크인은 유지)
        if (guardianIds.length > 0) {
          supabase.rpc("notify_guardians", { cid: id }).then(({ error: e }) => {
            if (e) console.warn("notify_guardians failed:", e.message);
          });
        }
      }
    }

    const notifIds = await scheduleReminders(state, scheduledStartAt, expectedEndAt, locationName);

    // 바로 시작하는 활동이고 경로 기록을 켰으면 트래킹 시작
    if (state === "active" && recordTrack) {
      startTracking().catch((e) => console.warn("startTracking failed:", e));
    } else {
      clearTrack().catch(() => {});
    }

    set({
      active: {
        id,
        activity,
        title,
        locationName,
        tags,
        scheduledStartAt: scheduledStartAt.toISOString(),
        expectedEndAt: expectedEndAt.toISOString(),
        state,
        notifIds,
        recordTrack,
      },
    });
  },

  confirmStart: async () => {
    const active = get().active;
    if (!active || active.state === "active") return;

    if (supabase && !active.id.startsWith("local-")) {
      const { error } = await supabase
        .from("check_ins")
        .update({ status: "active" })
        .eq("id", active.id);
      if (error) throw new Error(error.message);
    }
    // 예약이 실제 시작될 때 경로 기록 개시
    if (active.recordTrack) {
      startTracking().catch((e) => console.warn("startTracking failed:", e));
    }
    // 진행중으로 바뀌었으니 피드('다가오는 활동' 카드)를 갱신 — 예약 카드가 사라진다
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    set({ active: { ...active, state: "active" } });
  },

  cancelScheduled: async () => {
    const active = get().active;
    if (!active) return;
    if (supabase && !active.id.startsWith("local-")) {
      // 서버 가드(동행 신청자 있으면 취소 불가)에 걸리면 여기서 에러 → 상태 유지
      const { error } = await supabase
        .from("check_ins")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", active.id);
      if (error) throw new Error(error.message);
    }
    cancelNotifs(active.notifIds);
    set({ active: null });
  },

  extend: async (hours) => {
    const active = get().active;
    if (!active) return;

    const newEnd = new Date(new Date(active.expectedEndAt).getTime() + hours * 3_600_000);

    if (supabase && !active.id.startsWith("local-")) {
      const { error } = await supabase
        .from("check_ins")
        .update({ expected_end_at: newEnd.toISOString() })
        .eq("id", active.id);
      if (error) throw new Error(error.message);
    }

    cancelNotifs(active.notifIds);
    const notifIds = await scheduleReminders(
      "active",
      new Date(active.scheduledStartAt),
      newEnd,
      active.locationName,
    );

    set({ active: { ...active, expectedEndAt: newEnd.toISOString(), notifIds } });
  },

  complete: async () => {
    const active = get().active;
    if (!active) return;

    // 경로 기록 중이었다면 멈추고 경로·거리 저장
    let track: { lat: number; lng: number; t: number }[] = [];
    let distance = 0;
    if (active.recordTrack) {
      track = await stopTracking().catch(() => []);
      distance = trackDistance(track);
    }

    if (supabase && !active.id.startsWith("local-")) {
      const { error } = await supabase
        .from("check_ins")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          ...(active.recordTrack ? { track, track_distance_m: distance } : {}),
        })
        .eq("id", active.id);
      if (error) throw new Error(error.message);
    }

    clearTrack().catch(() => {});
    cancelNotifs(active.notifIds);
    // 완료로 바뀌었으니 피드 갱신 — 카드가 '종료'로 표기된다
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    set({ active: null });
  },
}));
