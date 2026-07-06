import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase, isDemoMode } from "@/lib/supabase";

type SessionState = {
  session: Session | null;
  /** Supabase 미설정 상태에서 "둘러보기"로 진입한 경우 */
  isDemo: boolean;
  initialized: boolean;
  enterDemo: () => void;
  signOut: () => Promise<void>;
  init: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  isDemo: false,
  initialized: false,

  enterDemo: () => set({ isDemo: true }),

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ session: null, isDemo: false });
  },

  init: () => {
    if (isDemoMode || !supabase) {
      set({ initialized: true });
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, initialized: true });
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
    });
  },
}));

export const useIsSignedIn = () =>
  useSessionStore((s) => s.session !== null || s.isDemo);
