import { FlatList, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useNearbyUsers } from "@/features/matching/hooks";
import type { NearbyUser } from "@/features/matching/types";
import { ACTIVITY_LABELS, colors, spacing, typography } from "@/theme/tokens";

function UserCard({ user }: { user: NearbyUser }) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.nickname}>{user.nickname}</Text>
          <Text style={styles.meta}>
            {user.activity ? `${ACTIVITY_LABELS[user.activity]}` : "아웃도어"}
            {user.isFriend ? " · 친구 (근처)" : " · 대략 위치"}
          </Text>
        </View>
        <Tag label={`Lv.${user.level}`} tone={user.isFriend ? "accent" : "default"} />
      </View>
      <Button
        label="버디 요청 보내기"
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: "/buddy/new",
            params: { userId: user.userId, nickname: user.nickname },
          })
        }
      />
    </Card>
  );
}

export default function FindBuddy() {
  const { data: users } = useNearbyUsers();

  return (
    <Screen padded={false}>
      <FlatList
        data={users}
        keyExtractor={(u) => u.userId}
        renderItem={({ item }) => <UserCard user={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.notice}>
            지금 활동 중인 사람들이에요. 위치는 반경 10km 안의 대략치로만 표시되고, 친구가 되면
            20km 이내일 때 500m로 더 정확히 보여요.
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            emoji="🏔️"
            title="주변에 활동자가 없어요"
            description="지역에 사람이 모이는 시간대(주말 오전)에 다시 확인해 보세요."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  notice: {
    ...typography.caption,
    color: colors.subtext,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  card: { marginBottom: spacing.sm + 4, gap: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  info: { gap: spacing.xs },
  nickname: { ...typography.heading, color: colors.text },
  meta: { ...typography.caption, color: colors.subtext },
});
