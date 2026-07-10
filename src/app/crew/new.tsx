import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { useCreateCrew } from "@/features/crew/hooks";
import type { JoinMode } from "@/features/crew/api";
import { ACTIVITY_LABELS, colors, radius, spacing, typography, type Activity } from "@/theme/tokens";

const EMOJIS = [
  "🏔️", "⛷️", "🏂", "🥾", "🏃", "🚵", "🚴", "🎒", "🔥", "🌲",
  "⛺", "🧗", "🏕️", "🌄", "❄️", "☀️", "🌊", "🍁", "🐺", "🦌",
];
const MAX_EMOJIS = 3;

export default function NewCrew() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [activity, setActivity] = useState<Activity | null>(null);
  const [region, setRegion] = useState("");
  const [emojis, setEmojis] = useState<string[]>(["🏔️"]);
  const [joinMode, setJoinMode] = useState<JoinMode>("open");

  const { mutateAsync, isPending } = useCreateCrew();

  const toggleEmoji = (e: string) =>
    setEmojis((prev) =>
      prev.includes(e)
        ? prev.filter((x) => x !== e)
        : prev.length < MAX_EMOJIS
          ? [...prev, e]
          : prev,
    );

  const submit = async () => {
    try {
      const crewId = await mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        activity,
        region: region.trim() || null,
        emoji: emojis.join("") || "🏔️",
        joinMode,
      });
      router.dismissTo(`/crew/${crewId}`);
    } catch (e) {
      Alert.alert("크루 만들기 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    }
  };

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>크루 이름</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="예) 용평 주말 라이더스"
          placeholderTextColor={colors.subtext}
          maxLength={30}
          autoFocus
        />

        <Text style={styles.label}>대표 이모지 (최대 {MAX_EMOJIS}개)</Text>
        <View style={styles.previewRow}>
          <Text style={styles.preview}>{emojis.join("") || "🏔️"}</Text>
          <Text style={styles.hint}>골라서 조합할 수 있어요 · 순서대로 표시</Text>
        </View>
        <View style={styles.chips}>
          {EMOJIS.map((e) => {
            const on = emojis.includes(e);
            return (
              <Pressable
                key={e}
                onPress={() => toggleEmoji(e)}
                style={[styles.emojiChip, on && styles.chipActive]}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>대표 활동 (선택)</Text>
        <View style={styles.chips}>
          {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((a) => (
            <Pressable
              key={a}
              onPress={() => setActivity(activity === a ? null : a)}
              style={[styles.chip, activity === a && styles.chipActive]}
            >
              <Text style={[styles.chipText, activity === a && styles.chipTextActive]}>
                {ACTIVITY_LABELS[a]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>주 활동 지역 (선택)</Text>
        <TextInput
          style={styles.input}
          value={region}
          onChangeText={setRegion}
          placeholder="예) 용평 / 북한산 / 한강"
          placeholderTextColor={colors.subtext}
        />

        <Text style={styles.label}>소개</Text>
        <TextInput
          style={[styles.input, styles.desc]}
          value={description}
          onChangeText={setDescription}
          placeholder="크루를 소개해 주세요 (언제, 어디서, 어떤 분위기인지)"
          placeholderTextColor={colors.subtext}
          multiline
          maxLength={300}
        />

        <Text style={styles.label}>가입 방식</Text>
        <View style={styles.chips}>
          <Pressable
            onPress={() => setJoinMode("open")}
            style={[styles.chip, joinMode === "open" && styles.chipActive]}
          >
            <Text style={[styles.chipText, joinMode === "open" && styles.chipTextActive]}>
              🌐 바로 가입
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setJoinMode("approval")}
            style={[styles.chip, joinMode === "approval" && styles.chipActive]}
          >
            <Text style={[styles.chipText, joinMode === "approval" && styles.chipTextActive]}>
              ✋ 승인제
            </Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          {joinMode === "open"
            ? "누구나 바로 가입할 수 있어요. 크루를 빨리 키우고 싶을 때 좋아요."
            : "크루장이 승인해야 가입돼요. 친목 위주 크루에 좋아요."}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="크루 만들기"
          onPress={submit}
          loading={isPending}
          disabled={name.trim().length < 2}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm + 4,
  },
  input: {
    ...typography.body,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  desc: { minHeight: 90, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  emojiChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: { fontSize: 22 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  preview: { fontSize: 30 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.body, color: colors.subtext },
  chipTextActive: { color: colors.invert, fontWeight: "700" },
  hint: { ...typography.caption, color: colors.subtext, marginTop: spacing.sm, lineHeight: 18 },
  footer: { paddingVertical: spacing.md },
});
