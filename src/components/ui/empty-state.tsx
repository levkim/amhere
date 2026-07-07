import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/theme/tokens";
import { Button } from "./button";

type Props = {
  emoji?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
};

export function EmptyState({ emoji = "🏔️", title, description, ctaLabel, onCta }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.emojiRing}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {ctaLabel && onCta ? (
        <View style={styles.cta}>
          <Button label={ctaLabel} onPress={onCta} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emojiRing: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emoji: { fontSize: 44 },
  title: { ...typography.title, fontSize: 20, color: colors.text, textAlign: "center" },
  desc: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  cta: { marginTop: spacing.lg, alignSelf: "stretch" },
});
