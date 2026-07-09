import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme/tokens";

type Props = PropsWithChildren<{
  /** 지도처럼 가장자리까지 채우는 화면은 padded=false */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  /** safe area 적용 가장자리. 탭 화면은 하단을 탭바가 처리하므로 ["top"]만 준다 */
  edges?: readonly Edge[];
}>;

export function Screen({ children, padded = true, style, edges = ["top", "bottom"] }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={[styles.body, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  padded: { paddingHorizontal: spacing.md },
});
