import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useUserHighlights } from "@/features/feed/archive";
import { colors, radius, spacing, typography } from "@/theme/tokens";

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

/** 프로필 상단 하이라이트 (인스타식 원형 스트립) — 없으면 렌더 안 함 */
export function HighlightsStrip({ userId }: { userId: string }) {
  const { data: highlights } = useUserHighlights(userId);
  if (!highlights || highlights.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>⭐ 하이라이트</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {highlights.map((h) => (
            <Pressable
              key={h.id}
              onPress={() => router.push(`/post/view/${h.id}`)}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.circle}>
                {h.imageUrl ? (
                  <Image source={{ uri: h.imageUrl }} style={styles.circleImage} />
                ) : (
                  <Text style={styles.circleEmoji}>
                    {h.activity ? (ACTIVITY_EMOJI[h.activity] ?? "📍") : "📍"}
                  </Text>
                )}
              </View>
              <Text style={styles.label} numberOfLines={1}>
                {h.placeName ?? h.body}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { ...typography.caption, color: colors.subtext, fontWeight: "700" },
  row: { flexDirection: "row", gap: spacing.md },
  item: { alignItems: "center", width: 64, gap: 4 },
  circle: {
    width: 58,
    height: 58,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  circleImage: { width: "100%", height: "100%" },
  circleEmoji: { fontSize: 24 },
  label: { ...typography.caption, fontSize: 10, color: colors.subtext, textAlign: "center" },
});
