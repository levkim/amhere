import { memo, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Mapbox, { Camera, LineLayer, MapView, MarkerView, ShapeSource } from "@rnmapbox/maps";
import type { LiveMember } from "@/features/activity/live";
import { colors } from "@/theme/tokens";

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? null);

// 멤버별 마커·꼬리 색 (순환)
const MEMBER_COLORS = ["#2DD4A7", "#3B82F6", "#FBBF24", "#F87171", "#A78BFA", "#F472B6"];

type Props = {
  members: LiveMember[];
  selectedId: string | null;
  onSelect: (userId: string) => void;
};

function LiveActivityMapInner({ members, selectedId, onSelect }: Props) {
  const cameraRef = useRef<Camera>(null);

  // 전체 멤버가 보이는 바운딩 박스
  const bounds = useMemo(() => {
    if (members.length === 0) return null;
    let minLng = Infinity,
      minLat = Infinity,
      maxLng = -Infinity,
      maxLat = -Infinity;
    for (const m of members) {
      minLng = Math.min(minLng, m.lng);
      maxLng = Math.max(maxLng, m.lng);
      minLat = Math.min(minLat, m.lat);
      maxLat = Math.max(maxLat, m.lat);
    }
    // 한 명뿐이면 살짝 여유
    if (minLng === maxLng) {
      minLng -= 0.003;
      maxLng += 0.003;
      minLat -= 0.003;
      maxLat += 0.003;
    }
    return { ne: [maxLng, maxLat] as [number, number], sw: [minLng, minLat] as [number, number] };
  }, [members]);

  return (
    <MapView style={StyleSheet.absoluteFill} styleURL={Mapbox.StyleURL.Outdoors} scaleBarEnabled={false}>
      <Camera
        ref={cameraRef}
        defaultSettings={
          bounds
            ? {
                bounds: {
                  ...bounds,
                  paddingLeft: 60,
                  paddingRight: 60,
                  paddingTop: 80,
                  paddingBottom: 220,
                },
              }
            : undefined
        }
      />

      {members.map((m, i) => {
        const color = MEMBER_COLORS[i % MEMBER_COLORS.length];
        const trailCoords = m.trail.map((p) => [p.lng, p.lat]);
        const selected = m.userId === selectedId;
        const stale = Date.now() - new Date(m.updatedAt).getTime() > 5 * 60_000; // 5분 무응답

        return (
          <View key={m.userId}>
            {trailCoords.length >= 2 ? (
              <ShapeSource
                id={`trail-${m.userId}`}
                shape={{
                  type: "Feature",
                  geometry: { type: "LineString", coordinates: trailCoords },
                  properties: {},
                }}
              >
                <LineLayer
                  id={`trail-line-${m.userId}`}
                  style={{
                    lineColor: color,
                    lineWidth: selected ? 5 : 3,
                    lineOpacity: stale ? 0.3 : 0.75,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              </ShapeSource>
            ) : null}

            <MarkerView id={`member-${m.userId}`} coordinate={[m.lng, m.lat]}>
              <Pressable onPress={() => onSelect(m.userId)} style={styles.markerWrap}>
                <View
                  style={[
                    styles.marker,
                    { backgroundColor: stale ? colors.muted : color },
                    selected && styles.markerSelected,
                  ]}
                >
                  <Text style={styles.markerInitial}>{m.nickname.slice(0, 1)}</Text>
                </View>
                <View style={styles.nameTag}>
                  <Text style={styles.nameText} numberOfLines={1}>
                    {m.nickname}
                  </Text>
                </View>
              </Pressable>
            </MarkerView>
          </View>
        );
      })}
    </MapView>
  );
}

export const LiveActivityMap = memo(LiveActivityMapInner);

const styles = StyleSheet.create({
  markerWrap: { alignItems: "center" },
  marker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  markerSelected: { borderColor: "#FDE68A", transform: [{ scale: 1.15 }] },
  markerInitial: { color: "#fff", fontWeight: "800", fontSize: 15 },
  nameTag: {
    marginTop: 2,
    backgroundColor: "rgba(11, 17, 32, 0.85)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: 90,
  },
  nameText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
