import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { isDemoMode } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";
import { useMyProfile } from "@/features/profile/hooks";
import { useMyStats } from "@/features/profile/stats";
import { useMyBadges } from "@/features/profile/badges";
import { Avatar, SnsRow } from "@/components/profile-bits";
import { ACTIVITY_LABELS, colors, radius, spacing, typography } from "@/theme/tokens";

function Stat({ value, label, to }: { value: number; label: string; to: Href }) {
  return (
    <Pressable
      onPress={() => router.push(to)}
      style={({ pressed }) => [styles.stat, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

export default function Profile() {
  const signOut = useSessionStore((s) => s.signOut);
  const { data: profile } = useMyProfile();
  const { data: stats } = useMyStats();
  const { data: badges } = useMyBadges();

  return (
    <Screen>
      <Card style={styles.card}>
        {/* 아바타 + [닉네임 / 친구·체크인·포스트] 가로 헤더 */}
        <View style={styles.header}>
          <Avatar url={profile?.avatarUrl ?? null} size={64} />
          <View style={styles.headerRight}>
            <Text style={styles.name} numberOfLines={1}>
              {profile?.nickname ?? "..."}
            </Text>
            <View style={styles.stats}>
              <Stat value={stats?.friends ?? 0} label="친구" to="/(tabs)/buddies" />
              <View style={styles.statDivider} />
              <Stat value={stats?.checkins ?? 0} label="체크인" to="/profile/history" />
              <View style={styles.statDivider} />
              <Stat value={stats?.posts ?? 0} label="포스트" to="/(tabs)/feed" />
            </View>
          </View>
        </View>

        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        <SnsRow sns={profile?.sns ?? {}} />
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
          <Button
            label="📖 내 활동 기록"
            variant="secondary"
            onPress={() => router.push("/profile/history")}
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>획득한 배지</Text>
        {badges && badges.length > 0 ? (
          <View style={styles.badgeGrid}>
            {badges.map((b) => (
              <View key={b.code} style={styles.badge}>
                <Text style={styles.badgeIcon}>{b.icon ?? "🏅"}</Text>
                <Text style={styles.badgeName}>{b.name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.desc}>
            아직 배지가 없어요. 체크인·포스트·버디를 쌓으면 배지가 열려요.
          </Text>
        )}
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
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  headerRight: { flex: 1, gap: spacing.sm },
  name: { ...typography.title, color: colors.text },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { ...typography.heading, fontSize: 20, color: colors.text },
  statLabel: { ...typography.caption, color: colors.subtext, marginTop: 1 },
  statDivider: { width: 1, height: 24, backgroundColor: colors.border },
  bio: { ...typography.body, color: colors.subtext, lineHeight: 21 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
  editBtn: { marginTop: spacing.sm, gap: spacing.sm },
  sectionTitle: { ...typography.heading, color: colors.text },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  badge: { alignItems: "center", width: 72, gap: 4 },
  badgeIcon: { fontSize: 34 },
  badgeName: { ...typography.caption, color: colors.subtext, textAlign: "center" },
  desc: { ...typography.body, color: colors.subtext, lineHeight: 21 },
  strong: { color: colors.text, fontWeight: "600" },
  footer: { flex: 1, justifyContent: "flex-end", paddingBottom: spacing.xl },
});
