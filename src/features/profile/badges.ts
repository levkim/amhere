import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";

// 배지 표시 정보는 앱 코드(안정적 UTF-8)에서 관리한다.
// DB는 "어떤 코드를 획득했는지"만 담당 (이모지 인코딩 깨짐 방지).
export const BADGE_META: Record<string, { name: string; icon: string }> = {
  first_checkin: { name: "첫 발자국", icon: "👣" },
  checkin_5: { name: "주말 워리어", icon: "⛰️" },
  checkin_20: { name: "산의 주인", icon: "🏔️" },
  first_post: { name: "첫 소식", icon: "📍" },
  post_10: { name: "동네 소식통", icon: "📣" },
  buddy_5: { name: "인싸", icon: "🤝" },
};

export type EarnedBadge = { code: string; name: string; icon: string };

const DEMO_CODES = ["first_checkin", "first_post"];

function toEarned(codes: string[]): EarnedBadge[] {
  return codes
    .filter((c) => BADGE_META[c])
    .map((c) => ({ code: c, name: BADGE_META[c].name, icon: BADGE_META[c].icon }));
}

/** 조건 충족 배지를 서버에서 부여(award_badges)한 뒤 내 획득 배지 코드를 가져온다 */
export function useMyBadges() {
  const session = useSessionStore((s) => s.session);
  return useQuery({
    queryKey: ["my-badges", session?.user.id ?? "demo"],
    queryFn: async (): Promise<EarnedBadge[]> => {
      if (!supabase || !session) return toEarned(DEMO_CODES);

      await supabase.rpc("award_badges"); // 조건 충족분 부여 + 레벨 갱신

      const { data, error } = await supabase
        .from("user_badges")
        .select("badges(code)")
        .order("awarded_at", { ascending: true });
      if (error) throw new Error(error.message);

      const codes = (data ?? [])
        .map((r: any) => (Array.isArray(r.badges) ? r.badges[0]?.code : r.badges?.code))
        .filter(Boolean) as string[];
      return toEarned(codes);
    },
  });
}
