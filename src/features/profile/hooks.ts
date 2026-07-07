import { useMutation, useQuery } from "@tanstack/react-query";
import * as ImageManipulator from "expo-image-manipulator";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";
import type { Activity } from "@/theme/tokens";
import type { SnsLinks } from "./sns";

export type LocationPrivacy = "approximate" | "ghost";

export type Profile = {
  id: string;
  nickname: string;
  bio: string | null;
  activities: Activity[];
  privacy: LocationPrivacy;
  level: number;
  avatarUrl: string | null;
  sns: SnsLinks;
  onboarded: boolean;
};

const DEMO_PROFILE: Profile = {
  id: "me",
  nickname: "데모 사용자",
  bio: null,
  activities: ["ski"],
  privacy: "approximate",
  level: 1,
  avatarUrl: null,
  sns: {},
  onboarded: true,
};

function mapProfile(data: any): Profile {
  return {
    id: data.id,
    nickname: data.nickname,
    bio: data.bio,
    activities: data.activities ?? [],
    // ghost가 아니면 전부 approximate로 취급 (v2 위치 모델)
    privacy: data.privacy === "ghost" ? "ghost" : "approximate",
    level: data.level,
    avatarUrl: data.avatar_url,
    sns: data.sns ?? {},
    onboarded: data.onboarded ?? true,
  };
}

const PROFILE_COLUMNS =
  "id, nickname, bio, activities, privacy, level, avatar_url, sns, onboarded";

export function useMyProfile() {
  const session = useSessionStore((s) => s.session);
  return useQuery({
    queryKey: ["my-profile", session?.user.id ?? "demo"],
    queryFn: async (): Promise<Profile> => {
      if (!supabase || !session) return DEMO_PROFILE;
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", session.user.id)
        .single();
      if (error) throw new Error(error.message);
      return mapProfile(data);
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
          ...DEMO_PROFILE,
          id: userId,
          nickname: "데모 유저",
          bio: "데모 모드에서는 프로필 상세를 흉내만 내요.",
          activities: ["ski", "backcountry"],
          level: 3,
        };
      }
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", userId)
        .single();
      if (error) throw new Error(error.message);
      return mapProfile(data);
    },
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (
      patch: Partial<
        Pick<Profile, "nickname" | "bio" | "activities" | "privacy" | "sns" | "onboarded">
      >,
    ) => {
      if (!supabase) return; // 데모 모드: 저장 생략
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("로그인이 필요해요.");
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-profile"] }),
  });
}

/** 프로필 사진 업로드: 정사각 512px로 리사이즈 → avatars 버킷 → avatar_url 갱신 */
export function useUploadAvatar() {
  return useMutation({
    mutationFn: async (localUri: string): Promise<string> => {
      if (!supabase) return localUri; // 데모 모드: 로컬 경로만 반환

      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("로그인이 필요해요.");

      const resized = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 512 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );

      const arrayBuffer = await fetch(resized.uri).then((r) => r.arrayBuffer());
      const path = `${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, arrayBuffer, { contentType: "image/jpeg" });
      if (uploadError) throw new Error(`사진 업로드 실패: ${uploadError.message}`);

      const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (error) throw new Error(error.message);

      return url;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-profile"] }),
  });
}
