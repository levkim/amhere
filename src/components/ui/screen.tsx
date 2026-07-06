import { PropsWithChildren } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme/tokens";

type Props = PropsWithChildren<{
  /** 지도처럼 가장자리까지 채우는 화면은 padded=false */
  padded?: boolean;
  style?: ViewStyle;
}>;

export function Screen({ children, padded = true, style }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={[styles.body, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  padded: { paddingHorizontal: spacing.md },
});
