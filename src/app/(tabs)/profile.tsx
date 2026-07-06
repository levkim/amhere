import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { isDemoMode } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";
import { useMyProfile } from "@/features/profile/hooks";
import { ACTIVITY_LABELS, colors, spacing, typography } from "@/theme/tokens";

export default function Profile() {
  const signOut = useSessionStore((s) => s.signOut);
  const { data: profile } = useMyProfile();

  return (
    <Screen>
      <Card style={styles.card}>
        <Text style={styles.avatar}>⛷️</Text>
        <Text style={styles.name}>{profile?.nickname ?? "..."}</Text>
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        <View style={styles.badges}>
          <Tag label={`Lv.${profile?.level ?? 1}`} tone="accent" />
          {(profile?.activities ?? []).map((a) => (
            <Tag key={a} label={ACTIVITY_LABELS[a]} />
          ))}
          {isDemoMode ? <Tag label="데모 모드" /> : null}
        </View>
        <View style={styles.editBtn}>
          <Button
            label="프로필 편집"
            variant="secondary"
            onPress={() => router.push("/profile/edit")}
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>위치 공개 설정</Text>
        <Text style={styles.desc}>
          현재:{" "}
          <Text style={styles.strong}>
            {profile?.privacy === "ghost" ? "고스트 (숨김)" : "대략 위치 (반경 10km)"}
          </Text>
          {"\n"}지도에는 실제 위치가 아닌 반경 10km 안의 가상 위치만 보여요. 친구가 되면 20km
          이내일 때 500m로 더 정확히 표시됩니다. 프로필 편집에서 바꿀 수 있어요.
        </Text>
      </Card>

      <View style={styles.footer}>
        <Button label="로그아웃" variant="secondary" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md, gap: spacing.sm },
  avatar: { fontSize: 48 },
  name: { ...typography.title, color: colors.text },
  bio: { ...typography.body, color: colors.subtext, lineHeight: 21 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
  editBtn: { marginTop: spacing.sm },
  sectionTitle: { ...typography.heading, color: colors.text },
  desc: { ...typography.body, color: colors.subtext, lineHeight: 21 },
  strong: { color: colors.text, fontWeight: "600" },
  footer: { flex: 1, justifyContent: "flex-end", paddingBottom: spacing.xl },
});
