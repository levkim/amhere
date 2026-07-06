import * as ImageManipulator from "expo-image-manipulator";
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

/** 사진을 리사이즈(긴 변 1600px, JPEG) 후 Supabase Storage에 업로드하고 공개 URL을 반환 */
async function uploadPostImage(localUri: string, userId: string): Promise<string> {
  if (!supabase) return localUri; // 데모 모드: 로컬 경로 그대로 사용

  const resized = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1600 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );

  const arrayBuffer = await fetch(resized.uri).then((r) => r.arrayBuffer());
  const path = `${userId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, arrayBuffer, { contentType: "image/jpeg" });
  if (error) throw new Error(`사진 업로드 실패: ${error.message}`);

  return supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
}

export async function createPost(post: NewPost): Promise<void> {
  if (!supabase) {
    addMockPost(post); // 데모 모드: 로컬에만 추가
    return;
  }

  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");

  const imageUrl = post.imageUri ? await uploadPostImage(post.imageUri, userId) : null;

  const { error } = await supabase.from("posts").insert({
    author_id: userId,
    body: post.body,
    tags: post.tags,
    activity: post.activity,
    image_url: imageUrl,
    location: `POINT(${post.lng} ${post.lat})`,
  });
  if (error) throw new Error(error.message);
}
