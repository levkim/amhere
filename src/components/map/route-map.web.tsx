import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export type TrackPoint = { lat: number; lng: number; t: number };

type Props = { track: TrackPoint[]; height?: number };

// 웹에서는 Mapbox 네이티브 지도를 쓸 수 없어 안내 화면을 보여준다.
export function RouteMap({ track, height = 280 }: Props) {
  return (
    <View style={[styles.wrap, { height }]}>
      <Text style={styles.emoji}>🛰️</Text>
      <Text style={styles.note}>경로 지도는 폰(개발용 앱)에서 표시됩니다 · 포인트 {track.length}개</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceHigh,
  },
  emoji: { fontSize: 36 },
  note: { ...typography.caption, color: colors.subtext, marginTop: spacing.xs },
});
