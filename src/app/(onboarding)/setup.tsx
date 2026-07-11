import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/profile-bits";
import { useUpdateProfile, useUploadAvatar } from "@/features/profile/hooks";
import { ACTIVITY_LABELS, colors, radius, spacing, typography, type Activity } from "@/theme/tokens";

const STEPS = 4;

// 가입 동의 항목 (필수 4 + 선택 1) — 당근·토스식 일괄 동의 화면
type ConsentKey = "age" | "terms" | "privacy" | "location" | "marketing";
const CONSENTS: { key: ConsentKey; label: string; required: boolean; doc?: string }[] = [
  { key: "age", label: "만 14세 이상입니다", required: true },
  { key: "terms", label: "서비스 이용약관 동의", required: true, doc: "/legal/terms" },
  { key: "privacy", label: "개인정보 수집·이용 동의", required: true, doc: "/legal/privacy" },
  {
    key: "location",
    label: "위치기반서비스 이용약관 동의",
    required: true,
    doc: "/legal/location-terms",
  },
  { key: "marketing", label: "혜택·소식 알림 받기 (선택)", required: false },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState<Set<ConsentKey>>(new Set());
  const [nickname, setNickname] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allKeys = CONSENTS.map((c) => c.key);
  const allAgreed = agreed.size === allKeys.length;
  const requiredAgreed = CONSENTS.filter((c) => c.required).every((c) => agreed.has(c.key));

  const toggleConsent = (key: ConsentKey) =>
    setAgreed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleAll = () => setAgreed(allAgreed ? new Set() : new Set(allKeys));

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
      await updateProfile({
        nickname: nickname.trim(),
        activities,
        onboarded: true,
        terms_agreed_at: new Date().toISOString(),
        marketing_opt_in: agreed.has("marketing"),
      });
      // onboarded=true가 반영되면 _layout이 자동으로 (tabs)로 전환한다
    } catch (e) {
      Alert.alert("저장 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
      setSaving(false);
    }
  };

  const canNext = step === 0 ? requiredAgreed : step === 1 ? nickname.trim().length >= 2 : true;

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
            <Text style={styles.subtitle}>서비스 이용을 위해 약관에 동의해 주세요</Text>

            <Pressable onPress={toggleAll} style={[styles.agreeAll, allAgreed && styles.agreeAllOn]}>
              <Text style={[styles.checkbox, allAgreed && styles.checkboxOn]}>
                {allAgreed ? "✓" : ""}
              </Text>
              <Text style={styles.agreeAllText}>전체 동의</Text>
            </Pressable>

            {CONSENTS.map((c) => (
              <View key={c.key} style={styles.consentRow}>
                <Pressable onPress={() => toggleConsent(c.key)} style={styles.consentTap} hitSlop={6}>
                  <Text style={[styles.checkbox, agreed.has(c.key) && styles.checkboxOn]}>
                    {agreed.has(c.key) ? "✓" : ""}
                  </Text>
                  <Text style={styles.consentLabel}>
                    <Text style={c.required ? styles.required : styles.optional}>
                      {c.required ? "[필수] " : "[선택] "}
                    </Text>
                    {c.label}
                  </Text>
                </Pressable>
                {c.doc ? (
                  <Text style={styles.docLink} onPress={() => router.push(c.doc as any)}>
                    보기
                  </Text>
                ) : null}
              </View>
            ))}
          </>
        ) : step === 1 ? (
          <>
            <Text style={styles.emoji}>🏔️</Text>
            <Text style={styles.title}>반가워요!</Text>
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
        ) : step === 2 ? (
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
  // 약관 동의
  agreeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  agreeAllOn: { borderColor: colors.accent },
  agreeAllText: { ...typography.heading, fontSize: 16, color: colors.text },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  consentTap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    color: colors.invert,
    textAlign: "center",
    lineHeight: 21,
    fontWeight: "800",
    overflow: "hidden",
  },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  consentLabel: { ...typography.body, color: colors.text, flexShrink: 1 },
  required: { color: colors.accent, fontWeight: "700" },
  optional: { color: colors.subtext },
  docLink: {
    ...typography.caption,
    color: colors.subtext,
    textDecorationLine: "underline",
    padding: spacing.xs,
  },
});
