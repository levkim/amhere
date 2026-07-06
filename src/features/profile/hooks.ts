import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";
import type { Activity } from "@/theme/tokens";

export type LocationPrivacy = "approximate" | "ghost";

export type Profile = {
  id: string;
  nickname: string;
  bio: string | null;
  activities: Activity[];
  privacy: LocationPrivacy;
  level: number;
};

const DEMO_PROFILE: Profile = {
  id: "me",
  nickname: "데모 사용자",
  bio: null,
  activities: ["ski"],
  privacy: "approximate",
  level: 1,
};

export function useMyProfile() {
  const session = useSessionStore((s) => s.session);
  return useQuery({
    queryKey: ["my-profile", session?.user.id ?? "demo"],
    queryFn: async (): Promise<Profile> => {
      if (!supabase || !session) return DEMO_PROFILE;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nickname, bio, activities, privacy, level")
        .eq("id", session.user.id)
        .single();
      if (error) throw new Error(error.message);
      // ghost가 아니면 전부 approximate로 취급 (v2 위치 모델)
      const privacy: LocationPrivacy = data.privacy === "ghost" ? "ghost" : "approximate";
      return { ...data, privacy } as Profile;
    },
  });
}

/** 다른 사용자의 공개 프로필 (버디 요청 전 상세 보기용) */
export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<Profile> => {
      if (!supabase) {
        // 데모 모드: 목 유저 정보
        return {
          id: userId,
          nickname: "데모 유저",
          bio: "데모 모드에서는 프로필 상세를 흉내만 내요.",
          activities: ["ski", "backcountry"],
          privacy: "approximate",
          level: 3,
        };
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nickname, bio, activities, privacy, level")
        .eq("id", userId)
        .single();
      if (error) throw new Error(error.message);
      const privacy: LocationPrivacy = data.privacy === "ghost" ? "ghost" : "approximate";
      return { ...data, privacy } as Profile;
    },
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (patch: Partial<Omit<Profile, "id" | "level">>) => {
      if (!supabase) return; // 데모 모드: 저장 생략
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("로그인이 필요해요.");
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-profile"] }),
  });
}
