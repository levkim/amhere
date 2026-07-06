import { create } from "zustand";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { supabase } from "@/lib/supabase";
import type { Activity } from "@/theme/tokens";

// 안전 체크인.
// 초과 판정·비상 알림은 서버(safety-sweep)가 담당하고,
// 클라이언트는 시작/종료 기록 + 체크아웃 30분 전 리마인더만 맡는다.

type ActiveCheckIn = {
  id: string;
  activity: Activity;
  locationName: string;
  tags: string[];
  startedAt: string;
  expectedEndAt: string;
  reminderNotifId: string | null;
};

type StartInput = {
  activity: Activity;
  locationName: string;
  tags: string[];
  expectedEndAt: Date;
  contactId: string | null;
};

type SafetyState = {
  active: ActiveCheckIn | null;
  start: (input: StartInput) => Promise<void>;
  /** 예상 종료 시간을 뒤로 미룬다 (하산 지연 등으로 오알림 방지) */
  extend: (hours: number) => Promise<void>;
  complete: () => Promise<void>;
};

/** 체크아웃 30분 전 로컬 리마인더 예약 (시간이 안 되면 생략) */
async function scheduleReminder(expectedEndAt: Date): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const remindAt = new Date(expectedEndAt.getTime() - 30 * 60_000);
  if (remindAt.getTime() <= Date.now()) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: "체크아웃 30분 전이에요 ⏰",
        body: "활동이 끝나면 잊지 말고 체크아웃해 주세요. 늦으면 비상연락처에 알림이 가요.",
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: remindAt,
      },
    });
  } catch (e) {
    console.warn("reminder schedule failed:", e);
    return null;
  }
}

export const useSafetyStore = create<SafetyState>((set, get) => ({
  active: null,

  start: async ({ activity, locationName, tags, expectedEndAt, contactId }) => {
    const startedAt = new Date();

    let id = `local-${Date.now()}`; // 데모 모드용 로컬 ID
    if (supabase) {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        const { data, error } = await supabase
          .from("check_ins")
          .insert({
            user_id: user.id,
            activity,
            location_name: locationName,
            tags,
            contact_id: contactId,
            expected_end_at: expectedEndAt.toISOString(),
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        id = data.id;
      }
    }

    const reminderNotifId = await scheduleReminder(expectedEndAt);

    set({
      active: {
        id,
        activity,
        locationName,
        tags,
        startedAt: startedAt.toISOString(),
        expectedEndAt: expectedEndAt.toISOString(),
        reminderNotifId,
      },
    });
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

    // 리마인더도 새 종료 시간 기준으로 다시 예약
    if (active.reminderNotifId) {
      Notifications.cancelScheduledNotificationAsync(active.reminderNotifId).catch(() => {});
    }
    const reminderNotifId = await scheduleReminder(newEnd);

    set({
      active: { ...active, expectedEndAt: newEnd.toISOString(), reminderNotifId },
    });
  },

  complete: async () => {
    const active = get().active;
    if (!active) return;

    if (supabase && !active.id.startsWith("local-")) {
      const { error } = await supabase
        .from("check_ins")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", active.id);
      if (error) throw new Error(error.message);
    }

    if (active.reminderNotifId) {
      Notifications.cancelScheduledNotificationAsync(active.reminderNotifId).catch(() => {});
    }
    set({ active: null });
  },
}));
