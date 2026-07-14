import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";
import type { Coords } from "@/stores/location";
import type { NewPost, Post } from "./types";
import { addMockPost, deleteMockPost, getMockPosts, toggleMockHelpful } from "./mock";

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
    helpfulCount: Number(row.helpful_count ?? 0),
    iHelped: !!row.i_helped,
    visibility: row.visibility === "friends" ? "friends" : "public",
    checkInId: row.check_in_id ?? null,
    joinedCount: Number(row.joined_count ?? 0),
    placeName: row.place_name ?? null,
    scheduledStartAt: row.scheduled_start_at ?? null,
    checkinStatus: row.checkin_status ?? null,
    checkinTitle: row.checkin_title ?? null,
    checkinLocation: row.checkin_location ?? null,
  }));
}

/** 포스트 단건 조회 (거리 무관) — 채팅 초대 링크로 받은 활동을 열 때 사용.
 *  nearby 피드에 없는(멀리 있는) 활동도 열고 참가신청할 수 있게 한다. */
export async function fetchPostDetail(id: string): Promise<Post | null> {
  if (!supabase) return getMockPosts().find((p) => p.id === id) ?? null;

  const { data, error } = await supabase.rpc("post_detail", { pid: id });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
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
    distanceM: row.distance_m ?? 0,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    helpfulCount: Number(row.helpful_count ?? 0),
    iHelped: !!row.i_helped,
    visibility: row.visibility === "friends" ? "friends" : "public",
    checkInId: row.check_in_id ?? null,
    joinedCount: Number(row.joined_count ?? 0),
    placeName: row.place_name ?? null,
    scheduledStartAt: row.scheduled_start_at ?? null,
    checkinStatus: row.checkin_status ?? null,
    checkinTitle: row.checkin_title ?? null,
    checkinLocation: row.checkin_location ?? null,
  };
}

/** "도움됐어요" 토글 */
export async function toggleHelpful(postId: string, currentlyHelped: boolean): Promise<void> {
  if (!supabase) {
    toggleMockHelpful(postId);
    return;
  }
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");

  if (currentlyHelped) {
    const { error } = await supabase
      .from("post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("post_reactions")
      .insert({ post_id: postId, user_id: userId });
    if (error) throw new Error(error.message);
  }
}

/** 내 포스트 삭제 (RLS가 본인 것만 허용) */
export async function deletePost(postId: string): Promise<void> {
  if (!supabase) {
    deleteMockPost(postId);
    return;
  }
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
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
    visibility: post.visibility ?? "public",
    check_in_id: post.checkInId ?? null,
    place_name: post.placeName ?? null,
    crew_id: post.crewId ?? null,
    location: `POINT(${post.lng} ${post.lat})`,
  });
  if (error) throw new Error(error.message);
}
