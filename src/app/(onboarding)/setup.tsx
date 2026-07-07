import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/profile-bits";
import { useUpdateProfile, useUploadAvatar } from "@/features/profile/hooks";
import { ACTIVITY_LABELS, colors, radius, spacing, typography, type Activity } from "@/theme/tokens";

const STEPS = 3;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { mutateAsync: updateProfile } = useUpdateProfile();
  const { mutateAsync: uploadAvatar, isPending: uploading } = useUploadAvatar();

  const toggleActivity = (a: Activity) =>
    setActivities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    try {
      const url = await uploadAvatar(result.assets[0].uri);
      setAvatarPreview(url);
    } catch (e) {
      Alert.alert("사진 업로드 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      await updateProfile({ nickname: nickname.trim(), activities, onboarded: true });
      // onboarded=true가 반영되면 _layout이 자동으로 (tabs)로 전환한다
    } catch (e) {
      Alert.alert("저장 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
      setSaving(false);
    }
  };

  const canNext = step === 0 ? nickname.trim().length >= 2 : true;

  return (
    <Screen>
      <View style={styles.progress}>
        {Array.from({ length: STEPS }).map((_, i) => (
          <View key={i} style={[styles.dot, i <= step && styles.dotActive]} />
        ))}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        {step === 0 ? (
          <>
            <Text style={styles.emoji}>🏔️</Text>
            <Text style={styles.title}>여기있어에 오신 걸 환영해요</Text>
            <Text style={styles.subtitle}>지도에서 뭐라고 불러드릴까요?</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="닉네임 (2~20자)"
              placeholderTextColor={colors.subtext}
              maxLength={20}
              autoFocus
            />
          </>
        ) : step === 1 ? (
          <>
            <Text style={styles.emoji}>⛷️</Text>
            <Text style={styles.title}>어떤 활동을 즐기세요?</Text>
            <Text style={styles.subtitle}>같은 활동을 하는 사람을 찾아드릴게요 (여러 개 가능)</Text>
            <View style={styles.chips}>
              {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((a) => (
                <Pressable
                  key={a}
                  onPress={() => toggleActivity(a)}
                  style={[styles.chip, activities.includes(a) && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, activities.includes(a) && styles.chipTextActive]}
                  >
                    {ACTIVITY_LABELS[a]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>프로필 사진을 추가할까요?</Text>
            <Text style={styles.subtitle}>나중에 프로필에서 바꿀 수 있어요 (선택)</Text>
            <Pressable onPress={pickAvatar} disabled={uploading} style={styles.avatarWrap}>
              <Avatar url={avatarPreview} size={120} />
              <Text style={styles.avatarHint}>
                {uploading ? "업로드 중..." : "탭해서 사진 선택"}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step < STEPS - 1 ? (
          <Button label="다음" onPress={() => setStep((s) => s + 1)} disabled={!canNext} />
        ) : (
          <Button label="시작하기" onPress={finish} loading={saving} />
        )}
        {step === STEPS - 1 ? (
          <Pressable onPress={finish} style={styles.skip}>
            <Text style={styles.skipText}>건너뛰기</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: "row", gap: spacing.sm, paddingTop: spacing.md, justifyContent: "center" },
  dot: { width: 28, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent },
  body: { flexGrow: 1, justifyContent: "center", paddingVertical: spacing.xl },
  emoji: { fontSize: 56, textAlign: "center", marginBottom: spacing.md },
  title: { ...typography.title, color: colors.text, textAlign: "center" },
  subtitle: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  input: {
    ...typography.title,
    fontSize: 20,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    textAlign: "center",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
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
  chipTextActive: { color: colors.invert, fontWeight: "700" },
  avatarWrap: { alignItems: "center", gap: spacing.md, marginTop: spacing.lg },
  avatarHint: { ...typography.caption, color: colors.subtext },
  footer: { paddingVertical: spacing.md, gap: spacing.sm },
  skip: { alignItems: "center", padding: spacing.sm },
  skipText: { ...typography.body, color: colors.subtext },
});
