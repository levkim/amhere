import { supabase } from "@/lib/supabase";
import type { Coords } from "@/stores/location";
import type { NewPost, Post } from "./types";
import { addMockPost, getMockPosts } from "./mock";

const RADIUS_M = 5000;

export async function fetchNearbyPosts(coords: Coords): Promise<Post[]> {
  if (!supabase) return getMockPosts(); // 데모 모드

  const { data, error } = await supabase.rpc("nearby_posts", {
    lat: coords.lat,
    lng: coords.lng,
    radius_m: RADIUS_M,
  });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    authorId: row.author_id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    body: row.body,
    imageUrl: row.image_url,
    tags: row.tags ?? [],
    activity: row.activity,
    lat: row.lat,
    lng: row.lng,
    distanceM: row.distance_m,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

export async function createPost(post: NewPost): Promise<void> {
  if (!supabase) {
    addMockPost(post); // 데모 모드: 로컬에만 추가
    return;
  }

  const { error } = await supabase.from("posts").insert({
    author_id: (await supabase.auth.getUser()).data.user?.id,
    body: post.body,
    tags: post.tags,
    activity: post.activity,
    location: `POINT(${post.lng} ${post.lat})`,
  });
  if (error) throw new Error(error.message);
}
