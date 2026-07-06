import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { useMyProfile, useUpdateProfile } from "@/features/profile/hooks";
import { ACTIVITY_LABELS, colors, radius, spacing, typography, type Activity } from "@/theme/tokens";

export default function EditProfile() {
  const { data: profile } = useMyProfile();
  const { mutateAsync, isPending } = useUpdateProfile();

  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [ghost, setGhost] = useState(false);

  // 불러온 프로필로 초기화
  useEffect(() => {
    if (!profile) return;
    setNickname(profile.nickname);
    setBio(profile.bio ?? "");
    setActivities(profile.activities);
    setGhost(profile.privacy === "ghost");
  }, [profile]);

  const toggleActivity = (a: Activity) =>
    setActivities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const save = async () => {
    if (nickname.trim().length < 2) {
      Alert.alert("닉네임을 확인해 주세요", "닉네임은 2자 이상이어야 해요.");
      return;
    }
    try {
      await mutateAsync({
        nickname: nickname.trim(),
        bio: bio.trim() || null,
        activities,
        privacy: ghost ? "ghost" : "approximate",
      });
      router.back();
    } catch (e) {
      Alert.alert("저장 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    }
  };

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>닉네임</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="닉네임 (2~20자)"
          placeholderTextColor={colors.subtext}
          maxLength={20}
        />

        <Text style={styles.label}>자기소개</Text>
        <TextInput
          style={[styles.input, styles.bio]}
          value={bio}
          onChangeText={setBio}
          placeholder="어떤 활동을 즐기는지 소개해 보세요"
          placeholderTextColor={colors.subtext}
          multiline
          maxLength={200}
        />

        <Text style={styles.label}>즐기는 활동</Text>
        <View style={styles.chips}>
          {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((a) => (
            <Pressable
              key={a}
              onPress={() => toggleActivity(a)}
              style={[styles.chip, activities.includes(a) && styles.chipActive]}
            >
              <Text style={[styles.chipText, activities.includes(a) && styles.chipTextActive]}>
                {ACTIVITY_LABELS[a]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>위치 공개</Text>
        <View style={styles.ghostRow}>
          <View style={styles.ghostText}>
            <Text style={styles.ghostTitle}>고스트 모드</Text>
            <Text style={styles.ghostDesc}>
              켜면 지도에서 완전히 사라져요. 끄면 반경 10km 안의 대략 위치로만 표시됩니다.
            </Text>
          </View>
          <Switch
            value={ghost}
            onValueChange={setGhost}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="저장" onPress={save} loading={isPending} />
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
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  bio: { minHeight: 90, textAlignVertical: "top" },
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
  ghostRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  ghostText: { flex: 1 },
  ghostTitle: { ...typography.body, color: colors.text, fontWeight: "600" },
  ghostDesc: { ...typography.caption, color: colors.subtext, lineHeight: 18, marginTop: 2 },
  footer: { paddingVertical: spacing.md },
});
