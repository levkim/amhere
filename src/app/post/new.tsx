import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { useCreatePost } from "@/features/feed/hooks";
import { useEffectiveCoords } from "@/stores/location";
import { ACTIVITY_LABELS, colors, radius, spacing, typography, type Activity } from "@/theme/tokens";

const MAX_LEN = 200;
const PRESET_TAGS = ["설질좋음", "결빙주의", "혼잡", "크루모집", "초보환영", "뷰맛집"];

export default function NewPost() {
  const [body, setBody] = useState("");
  const [activity, setActivity] = useState<Activity>("ski");
  const [tags, setTags] = useState<string[]>([]);
  const coords = useEffectiveCoords();
  const { mutateAsync, isPending } = useCreatePost();

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const submit = async () => {
    try {
      await mutateAsync({ body: body.trim(), tags, activity, lat: coords.lat, lng: coords.lng });
      router.back();
    } catch (e) {
      Alert.alert("작성 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    }
  };

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>지금 여기, 무슨 일이 있나요?</Text>
        <TextInput
          style={styles.input}
          value={body}
          onChangeText={setBody}
          placeholder="예) 레인보우 상단 설질 최고. 오전에 꼭 타세요"
          placeholderTextColor={colors.subtext}
          multiline
          maxLength={MAX_LEN}
          autoFocus
        />
        <Text style={styles.counter}>
          {body.length}/{MAX_LEN} · 이 포스트는 현재 위치에 남고 24시간 후 사라져요
        </Text>

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

        <Text style={styles.label}>태그</Text>
        <View style={styles.chips}>
          {PRESET_TAGS.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => toggleTag(tag)}
              style={[styles.chip, tags.includes(tag) && styles.chipActive]}
            >
              <Text style={[styles.chipText, tags.includes(tag) && styles.chipTextActive]}>
                #{tag}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="포스트 남기기"
          onPress={submit}
          loading={isPending}
          disabled={body.trim().length === 0}
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
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 120,
    textAlignVertical: "top",
  },
  counter: { ...typography.caption, color: colors.subtext, marginTop: spacing.sm },
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
  footer: { paddingVertical: spacing.md },
});
