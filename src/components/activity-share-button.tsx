import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { ActivityShareSheet } from "@/components/activity-share-sheet";
import { colors, radius, typography } from "@/theme/tokens";

/** 채팅 입력창의 ➕ — 탭하면 활동 공유 시트를 열고, 고른 활동을 onShare로 전송 */
export function ActivityShareButton({ onShare }: { onShare: (body: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
        hitSlop={6}
      >
        <Text style={styles.plus}>＋</Text>
      </Pressable>
      <ActivityShareSheet visible={open} onClose={() => setOpen(false)} onShare={onShare} />
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  plus: { ...typography.title, color: colors.accent, lineHeight: 26 },
});
