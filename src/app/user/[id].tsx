import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useUserProfile } from "@/features/profile/hooks";
import { useMyUserId } from "@/features/matching/hooks";
import { ACTIVITY_LABELS, colors, spacing, typography } from "@/theme/tokens";

// 버디 요청 전 상대 프로필 상세 보기
export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useMyUserId();
  const { data: profile, isLoading, isError } = useUserProfile(id ?? "");

  if (isLoading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  if (isError || !profile) {
    return (
      <Screen>
        <EmptyState emoji="🤔" title="프로필을 찾을 수 없어요" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card style={styles.card}>
        <Text style={styles.avatar}>⛰️</Text>
        <Text style={styles.name}>{profile.nickname}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        <View style={styles.badges}>
          <Tag label={`Lv.${profile.level}`} tone="accent" />
          {profile.activities.map((a) => (
            <Tag key={a} label={ACTIVITY_LABELS[a]} />
          ))}
        </View>
      </Card>

      {profile.id !== myId ? (
        <View style={styles.action}>
          <Button
            label="버디 요청 보내기"
            onPress={() =>
              router.push({
                pathname: "/buddy/new",
                params: { userId: profile.id, nickname: profile.nickname },
              })
            }
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  card: { marginTop: spacing.md, gap: spacing.sm },
  avatar: { fontSize: 48 },
  name: { ...typography.title, color: colors.text },
  bio: { ...typography.body, color: colors.subtext, lineHeight: 21 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
  action: { marginTop: spacing.lg },
});
