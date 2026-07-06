import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { useSendBuddyRequest } from "@/features/matching/hooks";
import { ACTIVITY_LABELS, colors, radius, spacing, typography, type Activity } from "@/theme/tokens";

function dateAfter(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

const DATE_OPTIONS = [
  { label: "오늘", value: dateAfter(0) },
  { label: "내일", value: dateAfter(1) },
  { label: "모레", value: dateAfter(2) },
];

export default function NewBuddyRequest() {
  const { userId, nickname } = useLocalSearchParams<{ userId: string; nickname: string }>();
  const [activity, setActivity] = useState<Activity>("ski");
  const [plannedDate, setPlannedDate] = useState(DATE_OPTIONS[0].value);
  const [region, setRegion] = useState("");
  const [message, setMessage] = useState("");
  const { mutateAsync, isPending } = useSendBuddyRequest();

  const submit = async () => {
    if (!userId || !nickname) return;
    try {
      await mutateAsync({
        addresseeId: userId,
        addresseeNickname: nickname,
        activity,
        plannedDate,
        region: region.trim() || "내 주변",
        message: message.trim() || null,
      });
      Alert.alert("요청 완료", `${nickname}님에게 버디 요청을 보냈어요.`, [
        { text: "확인", onPress: () => router.dismissTo("/(tabs)/buddies") },
      ]);
    } catch (e) {
      Alert.alert("요청 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    }
  };

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{nickname}님에게 버디 요청</Text>

        <Text style={styles.label}>활동</Text>
        <View style={styles.chips}>
          {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setActivity(key)}
              style={[styles.chip, activity === key && styles.chipActive]}
            >
              <Text style={[styles.chipText, activity === key && styles.chipTextActive]}>
                {ACTIVITY_LABELS[key]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>날짜</Text>
        <View style={styles.chips}>
          {DATE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setPlannedDate(opt.value)}
              style={[styles.chip, plannedDate === opt.value && styles.chipActive]}
            >
              <Text
                style={[styles.chipText, plannedDate === opt.value && styles.chipTextActive]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>지역</Text>
        <TextInput
          style={styles.input}
          value={region}
          onChangeText={setRegion}
          placeholder="예) 용평 레인보우 / 발왕산 등산로"
          placeholderTextColor={colors.subtext}
        />

        <Text style={styles.label}>메시지 (선택)</Text>
        <TextInput
          style={[styles.input, styles.messageInput]}
          value={message}
          onChangeText={setMessage}
          placeholder="자기소개나 계획을 간단히 남기면 성사율이 올라가요"
          placeholderTextColor={colors.subtext}
          multiline
          maxLength={300}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button label="요청 보내기" onPress={submit} loading={isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text, marginTop: spacing.md },
  label: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm + 4,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.body, color: colors.subtext },
  chipTextActive: { color: colors.text, fontWeight: "600" },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  messageInput: { minHeight: 90, textAlignVertical: "top" },
  footer: { paddingVertical: spacing.md },
});
