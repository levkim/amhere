import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/profile-bits";
import { useNearbyUsers } from "@/features/matching/hooks";
import type { NearbyUser } from "@/features/matching/types";
import { useEffectiveCoords, type Coords } from "@/stores/location";
import { ACTIVITY_LABELS, colors, radius, spacing, typography, type Activity } from "@/theme/tokens";

function distanceKm(a: Coords, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

function UserRow({ user, meta }: { user: NearbyUser; meta: string }) {
  return (
    <Pressable
      onPress={() => router.push(`/user/${user.userId}`)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Avatar url={user.avatarUrl} size={48} />
      <View style={styles.info}>
        <View style={styles.nameLine}>
          <Text style={styles.nickname} numberOfLines={1}>
            {user.nickname}
          </Text>
          {user.isFriend ? <Text style={styles.friendTag}>친구</Text> : null}
        </View>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <View style={styles.lv}>
        <Text style={styles.lvText}>Lv.{user.level}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function FindBuddy() {
  const { data: users } = useNearbyUsers();
  const coords = useEffectiveCoords();
  const [filter, setFilter] = useState<Activity | null>(null);

  // 주변에 실제로 있는 활동만 필터로 노출
  const availableActivities = useMemo(() => {
    const set = new Set<Activity>();
    (users ?? []).forEach((u) => u.activity && set.add(u.activity));
    return [...set];
  }, [users]);

  // 필터 적용 + 친구 먼저 + 가까운 순
  const sorted = useMemo(() => {
    const list = (users ?? []).filter((u) => !filter || u.activity === filter);
    return [...list].sort((a, b) => {
      if (a.isFriend !== b.isFriend) return a.isFriend ? -1 : 1;
      return distanceKm(coords, a) - distanceKm(coords, b);
    });
  }, [users, filter, coords]);

  const metaFor = (u: NearbyUser): string => {
    const act = u.activity ? ACTIVITY_LABELS[u.activity] : "아웃도어";
    if (u.isFriend) return `${act} · 약 ${Math.max(1, Math.round(distanceKm(coords, u)))}km`;
    return `${act} · 대략 위치`;
  };

  return (
    <Screen padded={false}>
      {/* 활동 필터 */}
      {availableActivities.length > 0 ? (
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterChips}>
              <Pressable
                onPress={() => setFilter(null)}
                style={[styles.chip, filter === null && styles.chipActive]}
              >
                <Text style={[styles.chipText, filter === null && styles.chipTextActive]}>
                  전체
                </Text>
              </Pressable>
              {availableActivities.map((a) => (
                <Pressable
                  key={a}
                  onPress={() => setFilter(filter === a ? null : a)}
                  style={[styles.chip, filter === a && styles.chipActive]}
                >
                  <Text style={[styles.chipText, filter === a && styles.chipTextActive]}>
                    {ACTIVITY_LABELS[a]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}

      <FlatList
        data={sorted}
        keyExtractor={(u) => u.userId}
        renderItem={({ item }) => <UserRow user={item} meta={metaFor(item)} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListHeaderComponent={
          sorted.length > 0 ? (
            <Text style={styles.count}>지금 {sorted.length}명이 근처에서 활동 중이에요</Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            emoji="🏔️"
            title="주변에 활동자가 없어요"
            description="사람이 모이는 주말 오전에 다시 확인해 보세요. 위치는 항상 대략치로만 보여요."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterBar: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterChips: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.subtext },
  chipTextActive: { color: colors.invert, fontWeight: "700" },
  list: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  count: { ...typography.caption, color: colors.subtext, marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  rowPressed: { opacity: 0.6 },
  info: { flex: 1, gap: 2 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  nickname: { ...typography.heading, fontSize: 16, color: colors.text, flexShrink: 1 },
  friendTag: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  meta: { ...typography.caption, color: colors.subtext },
  lv: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  lvText: { ...typography.caption, color: colors.subtext, fontWeight: "700" },
  chevron: { ...typography.title, color: colors.muted },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: 48 + spacing.md },
});
