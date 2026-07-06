import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SNS_PLATFORMS, toSnsUrl, type SnsLinks } from "@/features/profile/sns";
import { colors, radius, spacing, typography } from "@/theme/tokens";

/** 프로필 사진 (없으면 이모지 폴백) */
export function Avatar({ url, size = 72 }: { url: string | null; size?: number }) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceHigh }}
      />
    );
  }
  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={{ fontSize: size * 0.55 }}>⛰️</Text>
    </View>
  );
}

/** SNS 아웃링크 버튼 줄 (등록된 것만 표시) */
export function SnsRow({ sns }: { sns: SnsLinks }) {
  const links = SNS_PLATFORMS.map((p) => ({ ...p, url: toSnsUrl(p.key, sns[p.key]) })).filter(
    (p) => p.url !== null,
  );
  if (links.length === 0) return null;

  return (
    <View style={styles.row}>
      {links.map((p) => (
        <Pressable
          key={p.key}
          onPress={() => Linking.openURL(p.url!)}
          style={({ pressed }) => [styles.snsBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.snsText}>
            {p.emoji} {p.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  snsBtn: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
  },
  snsText: { ...typography.caption, color: colors.text },
});
