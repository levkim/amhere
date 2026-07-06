import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Mapbox, { Camera, MapView, MarkerView } from "@rnmapbox/maps";
import { router } from "expo-router";
import type { Post } from "@/features/feed/types";
import type { NearbyUser } from "@/features/matching/types";
import type { Coords } from "@/stores/location";
import { ACTIVITY_LABELS, colors, radius, spacing, typography } from "@/theme/tokens";

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? null);

const ACTIVITY_EMOJI: Record<string, string> = {
  ski: "⛷️",
  snowboard: "🏂",
  backcountry: "🏔️",
  hiking: "🥾",
  trekking: "🎒",
  running: "🏃",
};

type Props = {
  center: Coords;
  posts: Post[];
  users: NearbyUser[];
};

/**
 * 라이브 맵 — Mapbox 지도 위에 내 위치, 주변 포스트(핀), 주변 사용자를 표시한다.
 * 이 컴포넌트는 네이티브 모듈이라 Expo Go에서는 동작하지 않고 dev build가 필요하다.
 */
export function LiveMap({ center, posts, users }: Props) {
  useEffect(() => {
    Mapbox.setTelemetryEnabled(false);
  }, []);

  return (
    <MapView
      style={styles.map}
      styleURL={Mapbox.StyleURL.Outdoors}
      scaleBarEnabled={false}
      logoEnabled
      attributionEnabled
    >
      <Camera zoomLevel={13} centerCoordinate={[center.lng, center.lat]} animationDuration={0} />

      {/* 내 위치 */}
      <MarkerView coordinate={[center.lng, center.lat]} anchor={{ x: 0.5, y: 0.5 }}>
        <View style={styles.me}>
          <View style={styles.meDot} />
        </View>
      </MarkerView>

      {/* 주변 사용자 — 좌표는 서버에서 이미 가상화됨. 친구는 강조 표시 */}
      {users.map((u) => (
        <MarkerView key={`u-${u.userId}`} coordinate={[u.lng, u.lat]} anchor={{ x: 0.5, y: 1 }}>
          <View style={[styles.userPin, u.isFriend && styles.friendPin]}>
            <Text style={styles.userEmoji}>
              {u.activity ? (ACTIVITY_EMOJI[u.activity] ?? "📍") : "📍"}
            </Text>
          </View>
        </MarkerView>
      ))}

      {/* 주변 포스트 */}
      {posts.map((p) => (
        <MarkerView key={`p-${p.id}`} coordinate={[p.lng, p.lat]} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.postPin} onTouchEnd={() => router.push(`/post/${p.id}`)}>
            <Text style={styles.postEmoji}>
              {p.activity ? (ACTIVITY_EMOJI[p.activity] ?? "💬") : "💬"}
            </Text>
          </View>
        </MarkerView>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
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
  postEmoji: { fontSize: 16 },
});
