import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";

export type ProfileStats = { friends: number; checkins: number; posts: number };

const DEMO_STATS: ProfileStats = { friends: 3, checkins: 5, posts: 2 };

/** 내 프로필 숫자: 친구(수락된 버디) / 체크인 / 포스트 */
export function useMyStats() {
  const session = useSessionStore((s) => s.session);
  return useQuery({
    queryKey: ["my-stats", session?.user.id ?? "demo"],
    queryFn: async (): Promise<ProfileStats> => {
      if (!supabase || !session) return DEMO_STATS;
      const uid = session.user.id;

      const [friends, checkins, posts] = await Promise.all([
        supabase
          .from("buddy_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "accepted")
          .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`),
        supabase.from("check_ins").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", uid),
      ]);

      return {
        friends: friends.count ?? 0,
        checkins: checkins.count ?? 0,
        posts: posts.count ?? 0,
      };
    },
  });
}
