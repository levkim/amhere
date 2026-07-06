import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { useEffectiveCoords } from "@/stores/location";
import { createPost, fetchNearbyPosts } from "./api";
import type { NewPost } from "./types";

/** 좌표를 ~1km 격자로 뭉개서 쿼리 키로 사용 (미세 이동마다 refetch 방지) */
const regionKey = (lat: number, lng: number) =>
  `${lat.toFixed(2)},${lng.toFixed(2)}`;

export function useNearbyPosts() {
  const coords = useEffectiveCoords();
  return useQuery({
    queryKey: ["feed", regionKey(coords.lat, coords.lng)],
    queryFn: () => fetchNearbyPosts(coords),
    refetchInterval: 30_000,
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
