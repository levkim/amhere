import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export function Tag({ label, tone = "default" }: { label: string; tone?: "default" | "accent" }) {
  return (
    <View style={[styles.tag, tone === "accent" && styles.accent]}>
      <Text style={[styles.text, tone === "accent" && styles.accentText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  accent: { backgroundColor: colors.accentSoft, borderColor: "transparent" },
  text: { ...typography.caption, color: colors.subtext },
  accentText: { color: colors.accent, fontWeight: "700" },
});
