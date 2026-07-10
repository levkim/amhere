import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Mapbox, { Camera, MapView, MarkerView } from "@rnmapbox/maps";
import { router } from "expo-router";
import type { Post } from "@/features/feed/types";
import type { NearbyUser } from "@/features/matching/types";
import type { Coords } from "@/stores/location";
import { colors, radius, shadow } from "@/theme/tokens";

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? null);

const ACTIVITY_EMOJI: Record<string, string> = {
  ski: "⛷️",
  snowboard: "🏂",
  backcountry: "🏔️",
  hiking: "🥾",
  trekking: "🎒",
  running: "🏃",
  mtb: "🚵",
  cycling: "🚴",
};

type Props = {
  center: Coords;
  posts: Post[];
  users: NearbyUser[];
  /** 핀 탭 시 미리보기용 콜백 (없으면 바로 상세로 이동) */
  onPostPress?: (post: Post) => void;
  onUserPress?: (user: NearbyUser) => void;
};

type PinItem =
  | { kind: "post"; id: string; lat: number; lng: number; post: Post }
  | { kind: "user"; id: string; lat: number; lng: number; user: NearbyUser };

type Cluster = { key: string; lat: number; lng: number; count: number; items: PinItem[] };

/** 줌 레벨에 따라 가까운 핀을 그리드로 묶는다 (간단 클러스터링) */
function clusterItems(items: PinItem[], zoom: number): { clusters: Cluster[]; singles: PinItem[] } {
  const cell = 360 / Math.pow(2, Math.round(zoom)) / 2; // 줌이 깊을수록 작은 셀
  const groups = new Map<string, PinItem[]>();
  for (const it of items) {
    const key = `${Math.floor(it.lat / cell)}:${Math.floor(it.lng / cell)}`;
    const arr = groups.get(key) ?? [];
    arr.push(it);
    groups.set(key, arr);
  }
  const clusters: Cluster[] = [];
  const singles: PinItem[] = [];
  for (const [key, arr] of groups) {
    if (arr.length >= 3 && zoom < 15) {
      clusters.push({
        key,
        lat: arr.reduce((s, x) => s + x.lat, 0) / arr.length,
        lng: arr.reduce((s, x) => s + x.lng, 0) / arr.length,
        count: arr.length,
        items: arr,
      });
    } else {
      singles.push(...arr);
    }
  }
  return { clusters, singles };
}

/**
 * 라이브 맵 — Mapbox 지도 위에 내 위치, 주변 포스트(핀), 주변 사용자를 표시한다.
 * 네이티브 모듈이라 Expo Go에서는 동작하지 않고 dev build가 필요하다.
 */
// 부모(홈)가 카운트다운으로 매초 리렌더되어도 지도는 데이터가 바뀔 때만 갱신
export const LiveMap = memo(function LiveMap({
  center,
  posts,
  users,
  onPostPress,
  onUserPress,
}: Props) {
  const cameraRef = useRef<Camera>(null);
  const [zoom, setZoom] = useState(13);

  useEffect(() => {
    Mapbox.setTelemetryEnabled(false);
  }, []);

  const { clusters, singles } = useMemo(() => {
    const items: PinItem[] = [
      ...posts.map((p) => ({ kind: "post" as const, id: `p-${p.id}`, lat: p.lat, lng: p.lng, post: p })),
      ...users.map((u) => ({ kind: "user" as const, id: `u-${u.userId}`, lat: u.lat, lng: u.lng, user: u })),
    ];
    return clusterItems(items, zoom);
  }, [posts, users, zoom]);

  const flyToMe = () =>
    cameraRef.current?.setCamera({
      centerCoordinate: [center.lng, center.lat],
      zoomLevel: 14,
      animationDuration: 700,
    });

  const zoomInto = (c: Cluster) =>
    cameraRef.current?.setCamera({
      centerCoordinate: [c.lng, c.lat],
      zoomLevel: Math.min(zoom + 2, 16),
      animationDuration: 500,
    });

  return (
    <View style={styles.wrap}>
      <MapView
        style={styles.map}
        styleURL={Mapbox.StyleURL.Outdoors}
        scaleBarEnabled={false}
        logoEnabled
        attributionEnabled
        onMapIdle={(state) => setZoom(state.properties.zoom)}
      >
        {/* 최초 위치만 지정 — 이후엔 자유롭게 탐색 (강제 리센터 없음) */}
        <Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: [center.lng, center.lat], zoomLevel: 13 }}
        />

        {/* 내 위치 */}
        <MarkerView coordinate={[center.lng, center.lat]} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.me}>
            <View style={styles.meDot} />
          </View>
        </MarkerView>

        {/* 클러스터 (숫자 원) — 탭하면 확대 */}
        {clusters.map((c) => (
          <MarkerView key={`c-${c.key}`} coordinate={[c.lng, c.lat]} anchor={{ x: 0.5, y: 0.5 }}>
            <Pressable onPress={() => zoomInto(c)} style={styles.cluster}>
              <Text style={styles.clusterText}>{c.count}</Text>
            </Pressable>
          </MarkerView>
        ))}

        {/* 개별 핀 */}
        {singles.map((it) =>
          it.kind === "user" ? (
            <MarkerView key={it.id} coordinate={[it.lng, it.lat]} anchor={{ x: 0.5, y: 1 }}>
              <Pressable
                onPress={() =>
                  onUserPress ? onUserPress(it.user) : router.push(`/user/${it.user.userId}`)
                }
                style={[styles.userPin, it.user.isFriend && styles.friendPin]}
              >
                <Text style={styles.userEmoji}>
                  {it.user.activity ? (ACTIVITY_EMOJI[it.user.activity] ?? "📍") : "📍"}
                </Text>
              </Pressable>
            </MarkerView>
          ) : (
            <MarkerView key={it.id} coordinate={[it.lng, it.lat]} anchor={{ x: 0.5, y: 1 }}>
              <Pressable
                onPress={() =>
                  onPostPress ? onPostPress(it.post) : router.push(`/post/${it.post.id}`)
                }
                style={[styles.postPin, it.post.tags.includes("체크인") && styles.checkinPin]}
              >
                <Text style={styles.postEmoji}>
                  {it.post.activity ? (ACTIVITY_EMOJI[it.post.activity] ?? "💬") : "💬"}
                </Text>
              </Pressable>
            </MarkerView>
          ),
        )}
      </MapView>

      {/* 내 위치 버튼 (좌하단) */}
      <Pressable
        onPress={flyToMe}
        style={({ pressed }) => [styles.myLocBtn, pressed && { opacity: 0.75 }]}
        hitSlop={8}
      >
        <Text style={styles.myLocIcon}>🎯</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  map: { flex: 1 },
  me: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(46,144,250,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  meDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: "#fff",
  },
  cluster: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 6,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  clusterText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  userPin: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  friendPin: { borderColor: colors.accent, borderWidth: 3 },
  userEmoji: { fontSize: 16 },
  postPin: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: "#fff",
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  checkinPin: { backgroundColor: colors.accent },
  postEmoji: { fontSize: 16 },
  myLocBtn: {
    position: "absolute",
    left: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(11, 17, 32, 0.85)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  myLocIcon: { fontSize: 18 },
});
