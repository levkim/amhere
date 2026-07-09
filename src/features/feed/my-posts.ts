import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";
import type { Activity } from "@/theme/tokens";
import type { PostVisibility } from "./types";
import { getMockPosts } from "./mock";

export type MyPost = {
  id: string;
  body: string;
  tags: string[];
  activity: Activity | null;
  imageUrl: string | null;
  visibility: PostVisibility;
  createdAt: string;
  expiresAt: string;
  helpfulCount: number;
};

/** 내가 쓴 포스트 전부 (만료 포함, 최신순) */
export function useMyPosts() {
  const session = useSessionStore((s) => s.session);
  return useQuery({
    queryKey: ["my-posts", session?.user.id ?? "demo"],
    queryFn: async (): Promise<MyPost[]> => {
      if (!supabase || !session) {
        // 데모 모드: 로컬 목에서 내 글만
        return getMockPosts()
          .filter((p) => p.authorId === "me")
          .map((p) => ({
            id: p.id,
            body: p.body,
            tags: p.tags,
            activity: p.activity,
            imageUrl: p.imageUrl,
            visibility: p.visibility,
            createdAt: p.createdAt,
            expiresAt: p.expiresAt,
            helpfulCount: p.helpfulCount,
          }));
      }

      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, body, tags, activity, image_url, visibility, created_at, expires_at, post_reactions(count)",
        )
        .eq("author_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);

      return (data ?? []).map((r: any) => ({
        id: r.id,
        body: r.body,
        tags: r.tags ?? [],
        activity: r.activity,
        imageUrl: r.image_url,
        visibility: r.visibility === "friends" ? "friends" : "public",
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        helpfulCount: Number(r.post_reactions?.[0]?.count ?? 0),
      }));
    },
  });
}
