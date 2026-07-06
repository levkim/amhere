import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import {
  blockUser,
  REPORT_REASONS,
  reportUser,
  type ReportReason,
} from "@/features/safety/moderation";
import { colors, radius, spacing, typography } from "@/theme/tokens";

// 신고/차단 화면. params: userId(필수), nickname, postId(선택)
export default function Report() {
  const { userId, nickname, postId } = useLocalSearchParams<{
    userId: string;
    nickname?: string;
    postId?: string;
  }>();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [loading, setLoading] = useState(false);

  const submitReport = async () => {
    if (!userId || !reason) return;
    setLoading(true);
    try {
      await reportUser(userId, reason, postId);
      Alert.alert("신고 접수됨", "신고해 주셔서 감사해요. 검토 후 조치하겠습니다.", [
        { text: "확인", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("신고 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const confirmBlock = () => {
    if (!userId) return;
    Alert.alert(
      "차단할까요?",
      `${nickname ?? "이 사용자"}님을 차단하면 서로의 포스트와 위치가 더 이상 보이지 않아요.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "차단",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(userId);
              Alert.alert("차단 완료", "", [{ text: "확인", onPress: () => router.back() }]);
            } catch (e) {
              Alert.alert("차단 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Text style={styles.title}>{nickname ?? "사용자"} 신고</Text>
      <Text style={styles.subtitle}>어떤 문제인가요?</Text>

      <View style={styles.reasons}>
        {REPORT_REASONS.map((r) => (
          <Pressable
            key={r}
            onPress={() => setReason(r)}
            style={[styles.reason, reason === r && styles.reasonActive]}
          >
            <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>{r}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Button label="신고하기" onPress={submitReport} loading={loading} disabled={!reason} />
        <View style={styles.blockBtn}>
          <Button label="이 사용자 차단" variant="danger" onPress={confirmBlock} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text, marginTop: spacing.md },
  subtitle: { ...typography.body, color: colors.subtext, marginTop: spacing.sm },
  reasons: { marginTop: spacing.lg, gap: spacing.sm },
  reason: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  reasonActive: { borderColor: colors.primary, backgroundColor: colors.surfaceHigh },
  reasonText: { ...typography.body, color: colors.text },
  reasonTextActive: { color: colors.primary, fontWeight: "600" },
  footer: { flex: 1, justifyContent: "flex-end", paddingBottom: spacing.xl, gap: spacing.sm },
  blockBtn: {},
});
