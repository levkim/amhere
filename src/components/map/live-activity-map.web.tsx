import { StyleSheet, Text, View } from "react-native";
import type { LiveMember } from "@/features/activity/live";
import { colors, spacing, typography } from "@/theme/tokens";

type Props = {
  members: LiveMember[];
  selectedId: string | null;
  onSelect: (userId: string) => void;
};

// 웹에서는 네이티브 지도를 쓸 수 없어 안내만 보여준다.
export function LiveActivityMap({ members }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>📡</Text>
      <Text style={styles.note}>
        라이브 맵은 폰(개발용 앱)에서 표시됩니다 · 공유 중 {members.length}명
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceHigh,
  },
  emoji: { fontSize: 42 },
  note: { ...typography.caption, color: colors.subtext, marginTop: spacing.sm },
});
