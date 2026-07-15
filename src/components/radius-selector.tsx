import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RADIUS_OPTIONS, useFeedPrefs } from "@/stores/feed-prefs";
import { colors, radius as radiusToken, spacing, typography } from "@/theme/tokens";

/** 피드 노출 반경 선택 칩 (무제한 / 100 / 50 / 30 / 10km) */
export function RadiusSelector() {
  const radiusM = useFeedPrefs((s) => s.radiusM);
  const setRadiusM = useFeedPrefs((s) => s.setRadiusM);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>📍 범위</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chips}>
          {RADIUS_OPTIONS.map((opt) => {
            const active = radiusM === opt.value;
            return (
              <Pressable
                key={opt.label}
                onPress={() => setRadiusM(opt.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { ...typography.caption, color: colors.subtext, fontWeight: "700" },
  chips: { flexDirection: "row", gap: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radiusToken.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { ...typography.caption, color: colors.subtext, fontWeight: "600" },
  chipTextActive: { color: colors.invert, fontWeight: "800" },
});
