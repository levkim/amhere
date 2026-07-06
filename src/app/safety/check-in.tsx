import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { useSafetyStore } from "@/features/safety/hooks";
import { ACTIVITY_LABELS, colors, radius, spacing, typography, type Activity } from "@/theme/tokens";

const DURATIONS = [2, 4, 6, 8] as const;

export default function CheckIn() {
  const [activity, setActivity] = useState<Activity>("hiking");
  const [duration, setDuration] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const start = useSafetyStore((s) => s.start);

  const begin = async () => {
    setLoading(true);
    try {
      await start(activity, duration);
      router.back();
    } catch (e) {
      Alert.alert("체크인 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.sectionTitle}>어떤 활동인가요?</Text>
      <View style={styles.options}>
        {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => setActivity(key)}
            style={[styles.option, activity === key && styles.optionActive]}
          >
            <Text style={[styles.optionText, activity === key && styles.optionTextActive]}>
              {ACTIVITY_LABELS[key]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>예상 활동 시간</Text>
      <View style={styles.options}>
        {DURATIONS.map((h) => (
          <Pressable
            key={h}
            onPress={() => setDuration(h)}
            style={[styles.option, duration === h && styles.optionActive]}
          >
            <Text style={[styles.optionText, duration === h && styles.optionTextActive]}>
              {h}시간
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.notice}>
        예상 종료 시간에서 15분이 지나도 체크아웃하지 않으면, 마지막 위치와 함께 알림이
        발송돼요. 판정은 서버에서 하므로 산에서 앱이 꺼져도 동작합니다.
      </Text>

      <View style={styles.footer}>
        <Button label="활동 시작" onPress={begin} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm + 4,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { ...typography.body, color: colors.subtext },
  optionTextActive: { color: colors.text, fontWeight: "600" },
  notice: {
    ...typography.caption,
    color: colors.subtext,
    lineHeight: 19,
    marginTop: spacing.lg,
  },
  footer: { flex: 1, justifyContent: "flex-end", paddingBottom: spacing.xl },
});
