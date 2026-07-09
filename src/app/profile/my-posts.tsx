import { Alert, FlatList, Image, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useMyPosts, type MyPost } from "@/features/feed/my-posts";
import { useDeletePost } from "@/features/feed/hooks";
import { queryClient } from "@/lib/query-client";
import { ACTIVITY_LABELS, colors, spacing, typography } from "@/theme/tokens";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MyPostCard({ post }: { post: MyPost }) {
  const expired = new Date(post.expiresAt).getTime() <= Date.now();
  const { mutateAsync: removePost, isPending } = useDeletePost();

  const confirmDelete = () =>
    Alert.alert("포스트 삭제", "이 포스트를 삭제할까요? 되돌릴 수 없어요.", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await removePost(post.id);
            queryClient.invalidateQueries({ queryKey: ["my-posts"] });
            queryClient.invalidateQueries({ queryKey: ["my-stats"] });
          } catch (e) {
            Alert.alert("삭제 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
          }
        },
      },
    ]);

  return (
    <Card
      onPress={expired ? undefined : () => router.push(`/post/${post.id}`)}
      style={[styles.card, expired && styles.expired]}
    >
      <View style={styles.header}>
        <Text style={styles.meta}>
          {formatDate(post.createdAt)}
          {post.helpfulCount > 0 ? ` · 👍 ${post.helpfulCount}` : ""}
        </Text>
        <View style={styles.headerTags}>
          {post.visibility === "friends" ? <Tag label="🤝 친구공개" tone="accent" /> : null}
          {expired ? <Tag label="만료됨" /> : null}
        </View>
      </View>
      <Text style={[styles.body, expired && styles.bodyExpired]}>{post.body}</Text>
      {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.image} /> : null}
      <View style={styles.tags}>
        {post.activity ? <Tag label={ACTIVITY_LABELS[post.activity]} tone="accent" /> : null}
        {post.tags.map((t) => (
          <Tag key={t} label={`#${t}`} />
        ))}
      </View>
      <Button label="삭제" variant="secondary" onPress={confirmDelete} loading={isPending} />
    </Card>
  );
}

export default function MyPosts() {
  const { data: posts } = useMyPosts();

  return (
    <Screen padded={false}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <MyPostCard post={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          posts && posts.length > 0 ? (
            <Text style={styles.notice}>
              내가 쓴 포스트예요. 만료된 글은 나에게만 보여요.
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            emoji="📍"
            title="아직 쓴 포스트가 없어요"
            description="피드에서 첫 포스트를 남겨보세요."
            ctaLabel="포스트 쓰기"
            onCta={() => router.push("/post/new")}
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
    textAlign: "center",
    marginBottom: spacing.md,
  },
  card: { marginBottom: spacing.sm + 4, gap: spacing.sm },
  expired: { opacity: 0.65 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTags: { flexDirection: "row", gap: spacing.xs + 2 },
  meta: { ...typography.caption, color: colors.subtext },
  body: { ...typography.body, color: colors.text, lineHeight: 22 },
  bodyExpired: { color: colors.subtext },
  image: { width: "100%", height: 160, borderRadius: 12 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
});
