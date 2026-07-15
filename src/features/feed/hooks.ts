import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { useEffectiveCoords } from "@/stores/location";
import { useFeedPrefs, UNLIMITED_RADIUS_M } from "@/stores/feed-prefs";
import { createPost, deletePost, fetchNearbyPosts, fetchPostDetail, toggleHelpful } from "./api";
import type { NewPost, Post } from "./types";

/** 좌표를 ~1km 격자로 뭉개서 쿼리 키로 사용 (미세 이동마다 refetch 방지) */
const regionKey = (lat: number, lng: number) =>
  `${lat.toFixed(2)},${lng.toFixed(2)}`;

export function useNearbyPosts() {
  const coords = useEffectiveCoords();
  const radiusM = useFeedPrefs((s) => s.radiusM);
  const effectiveRadius = radiusM ?? UNLIMITED_RADIUS_M;
  return useQuery({
    // 반경도 키에 포함 → 반경 바꾸면 자동 재조회
    queryKey: ["feed", regionKey(coords.lat, coords.lng), radiusM ?? "unlimited"],
    queryFn: () => fetchNearbyPosts(coords, effectiveRadius),
    refetchInterval: 30_000,
  });
}

/** 피드에 없는(멀리 있는) 포스트를 단건으로 — 채팅 초대 링크 진입용 폴백 */
export function usePostDetailFallback(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["post-detail", id],
    enabled: enabled && !!id,
    queryFn: (): Promise<Post | null> => fetchPostDetail(id),
  });
}

export function useCreatePost() {
  return useMutation({
    mutationFn: (post: NewPost) => createPost(post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useToggleHelpful() {
  return useMutation({
    mutationFn: ({ postId, iHelped }: { postId: string; iHelped: boolean }) =>
      toggleHelpful(postId, iHelped),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });
}

export function useDeletePost() {
  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });
}
