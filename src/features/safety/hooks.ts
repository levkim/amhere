import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Activity } from "@/theme/tokens";

// 안전 체크인 — MVP 골격.
// 실제 초과 판정은 서버(safety-sweep Edge Function)가 하므로,
// 클라이언트는 시작/종료 기록과 상태 표시만 담당한다.

type ActiveCheckIn = {
  id: string;
  activity: Activity;
  startedAt: string;
  expectedEndAt: string;
};

type SafetyState = {
  active: ActiveCheckIn | null;
  start: (activity: Activity, durationH: number) => Promise<void>;
  complete: () => Promise<void>;
};

export const useSafetyStore = create<SafetyState>((set, get) => ({
  active: null,

  start: async (activity, durationH) => {
    const startedAt = new Date();
    const expectedEndAt = new Date(startedAt.getTime() + durationH * 3_600_000);

    let id = `local-${Date.now()}`; // 데모 모드용 로컬 ID
    if (supabase) {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        const { data, error } = await supabase
          .from("check_ins")
          .insert({
            user_id: user.id,
            activity,
            expected_end_at: expectedEndAt.toISOString(),
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        id = data.id;
      }
    }

    set({
      active: {
        id,
        activity,
        startedAt: startedAt.toISOString(),
        expectedEndAt: expectedEndAt.toISOString(),
      },
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
    set({ active: null });
  },
}));
