import { StyleSheet, Text, View } from "react-native";
import type { Post } from "@/features/feed/types";
import type { NearbyUser } from "@/features/matching/types";
import type { Coords } from "@/stores/location";
import { colors, spacing, typography } from "@/theme/tokens";

type Props = {
  center: Coords;
  posts: Post[];
  users: NearbyUser[];
  /** 네이티브와 시그니처 통일용 (웹에서는 미사용) */
  onPostPress?: (post: Post) => void;
  onUserPress?: (user: NearbyUser) => void;
};

// 웹에서는 Mapbox 네이티브 지도를 쓸 수 없어 안내 화면을 보여준다.
// 실제 지도는 폰(dev build)에서만 렌더링된다.
export function LiveMap({ center, posts }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>🗺️</Text>
      <Text style={styles.coords}>
        {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
      </Text>
      <Text style={styles.note}>지도는 폰(개발용 앱)에서 표시됩니다 · 주변 포스트 {posts.length}개</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceHigh },
  emoji: { fontSize: 40 },
  coords: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  note: { ...typography.caption, color: colors.subtext, marginTop: spacing.xs },
});
