import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";
import type { Activity } from "@/theme/tokens";
import type { PostVisibility } from "./types";
import { getMockPosts } from "./mock";

/** 단일 포스트 뷰어/하이라이트용 최소 형태 */
export type SinglePost = {
  id: string;
  authorId: string;
  nickname: string;
  body: string;
  tags: string[];
  activity: Activity | null;
  imageUrl: string | null;
  placeName: string | null;
  visibility: PostVisibility;
  createdAt: string;
  expiresAt: string;
  highlighted: boolean;
};

function mapRow(r: any): SinglePost {
  return {
    id: r.id,
    authorId: r.author_id,
    nickname: r.profiles?.nickname ?? "회원",
    body: r.body,
    tags: r.tags ?? [],
    activity: r.activity,
    imageUrl: r.image_url,
    placeName: r.place_name ?? null,
    visibility: r.visibility === "friends" ? "friends" : "public",
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    highlighted: !!r.highlighted,
  };
}

const COLS =
  "id, author_id, body, tags, activity, image_url, place_name, visibility, created_at, expires_at, highlighted, profiles!author_id(nickname)";

/** 포스트 단건 직접 조회 (보관함·하이라이트 열람용 — 피드 캐시와 무관) */
export function usePostById(id: string) {
  return useQuery({
    queryKey: ["single-post", id],
    enabled: !!id,
    queryFn: async (): Promise<SinglePost | null> => {
      if (!supabase) {
        const p = getMockPosts().find((x) => x.id === id);
        if (!p) return null;
        return {
          id: p.id,
          authorId: p.authorId,
          nickname: p.nickname,
          body: p.body,
          tags: p.tags,
          activity: p.activity,
          imageUrl: p.imageUrl,
          placeName: p.placeName,
          visibility: p.visibility,
          createdAt: p.createdAt,
          expiresAt: p.expiresAt,
          highlighted: false,
        };
      }
      const { data, error } = await supabase.from("posts").select(COLS).eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapRow(data) : null;
    },
  });
}

/** 특정 사용자의 하이라이트 포스트 (프로필 상단 노출용) */
export function useUserHighlights(userId: string) {
  return useQuery({
    queryKey: ["highlights", userId],
    enabled: !!userId && userId !== "me",
    queryFn: async (): Promise<SinglePost[]> => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("posts")
        .select(COLS)
        .eq("author_id", userId)
        .eq("highlighted", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapRow);
    },
  });
}

/** 하이라이트 지정/해제 (내 포스트만 — RLS) */
export function useToggleHighlight() {
  return useMutation({
    mutationFn: async ({ postId, highlighted }: { postId: string; highlighted: boolean }) => {
      if (!supabase) return;
      const { error } = await supabase.from("posts").update({ highlighted }).eq("id", postId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["single-post", postId] });
      queryClient.invalidateQueries({ queryKey: ["highlights"] });
      queryClient.invalidateQueries({ queryKey: ["my-posts"] });
    },
  });
}
