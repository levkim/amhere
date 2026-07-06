import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { PostCard } from "@/components/post-card";
import { useNearbyPosts } from "@/features/feed/hooks";
import { colors, spacing, typography } from "@/theme/tokens";

export default function Feed() {
  const { data: posts, isLoading, isError, refetch, isRefetching } = useNearbyPosts();

  if (isLoading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <EmptyState
          emoji="📡"
          title="피드를 불러오지 못했어요"
          description="네트워크 연결을 확인해 주세요. 산악 지역에서는 신호가 약할 수 있어요."
          ctaLabel="다시 시도"
          onCta={() => refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={styles.list}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListHeaderComponent={
          <Text style={styles.freshness}>모든 포스트는 24시간 후 사라져요 — 지금의 정보만.</Text>
        }
        ListEmptyComponent={
          <EmptyState
            title="아직 주변 소식이 없어요"
            description="이 지역의 첫 포스트를 남겨보세요. 설질, 트레일 상태, 뭐든 좋아요."
            ctaLabel="첫 포스트 남기기"
            onCta={() => router.push("/post/new")}
          />
        }
      />
      <Pressable
        onPress={() => router.push("/post/new")}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.fabLabel}>＋</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  freshness: {
    ...typography.caption,
    color: colors.subtext,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  fab: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabLabel: { fontSize: 28, color: colors.text, lineHeight: 32 },
});
