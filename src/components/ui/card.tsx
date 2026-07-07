import { PropsWithChildren } from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { colors, radius, shadow, spacing } from "@/theme/tokens";

type Props = PropsWithChildren<{
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** 그림자(입체감) 적용 여부 */
  raised?: boolean;
}>;

export function Card({ children, onPress, style, raised = true }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        raised && shadow.card,
        pressed && onPress ? styles.pressed : null,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md + 2,
  },
  pressed: { backgroundColor: colors.surfaceHigh, borderColor: colors.borderStrong },
});
