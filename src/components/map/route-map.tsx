import { useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Mapbox, { Camera, LineLayer, MapView, ShapeSource } from "@rnmapbox/maps";
import { colors, radius } from "@/theme/tokens";

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? null);

export type TrackPoint = { lat: number; lng: number; t: number };

type Props = { track: TrackPoint[]; height?: number };

/** 저장된 GPS 경로를 지도 위 선으로 그린다 (Strava/AllTrails 스타일). */
export function RouteMap({ track, height = 280 }: Props) {
  const camera = useRef<Camera>(null);

  // [lng, lat] 좌표 배열 — GeoJSON은 경도 우선
  const coordinates = useMemo(() => track.map((p) => [p.lng, p.lat]), [track]);

  // 경로 전체가 보이도록 바운딩 박스 계산
  const bounds = useMemo(() => {
    if (track.length === 0) return null;
    let minLng = Infinity,
      minLat = Infinity,
      maxLng = -Infinity,
      maxLat = -Infinity;
    for (const p of track) {
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
    }
    return { ne: [maxLng, maxLat] as [number, number], sw: [minLng, minLat] as [number, number] };
  }, [track]);

  const line = useMemo(
    () => ({
      type: "Feature" as const,
      geometry: { type: "LineString" as const, coordinates },
      properties: {},
    }),
    [coordinates],
  );

  const start = track[0];
  const end = track[track.length - 1];

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView style={StyleSheet.absoluteFill} styleURL={Mapbox.StyleURL.Outdoors} scaleBarEnabled={false}>
        <Camera
          ref={camera}
          defaultSettings={
            bounds
              ? { bounds: { ...bounds, paddingLeft: 40, paddingRight: 40, paddingTop: 40, paddingBottom: 40 } }
              : undefined
          }
        />
        {coordinates.length >= 2 ? (
          <ShapeSource id="route" shape={line}>
            <LineLayer
              id="route-line"
              style={{
                lineColor: colors.accent,
                lineWidth: 5,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </ShapeSource>
        ) : null}
        {start ? (
          <Mapbox.MarkerView id="start" coordinate={[start.lng, start.lat]}>
            <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          </Mapbox.MarkerView>
        ) : null}
        {end && track.length > 1 ? (
          <Mapbox.MarkerView id="end" coordinate={[end.lng, end.lat]}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
          </Mapbox.MarkerView>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surface },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "#fff",
  },
});
