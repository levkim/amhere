import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";

export type EarnedBadge = {
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
};

const DEMO_BADGES: EarnedBadge[] = [
  { code: "first_checkin", name: "첫 발자국", description: "첫 아웃도어 체크인을 완료했어요", icon: "👣" },
  { code: "first_post", name: "첫 소식", description: "첫 포스트를 남겼어요", icon: "📍" },
];

/** 조건 충족 배지를 서버에서 부여(award_badges)한 뒤 내 획득 배지를 가져온다 */
export function useMyBadges() {
  const session = useSessionStore((s) => s.session);
  return useQuery({
    queryKey: ["my-badges", session?.user.id ?? "demo"],
    queryFn: async (): Promise<EarnedBadge[]> => {
      if (!supabase || !session) return DEMO_BADGES;

      await supabase.rpc("award_badges"); // 조건 충족분 부여 + 레벨 갱신

      const { data, error } = await supabase
        .from("user_badges")
        .select("badges(code, name, description, icon)")
        .order("awarded_at", { ascending: true });
      if (error) throw new Error(error.message);

      return (data ?? []).map((r: any) => ({
        code: r.badges?.code,
        name: r.badges?.name,
        description: r.badges?.description,
        icon: r.badges?.icon,
      }));
    },
  });
}
