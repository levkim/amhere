import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { usePostById, useToggleHighlight } from "@/features/feed/archive";
import { useDeletePost } from "@/features/feed/hooks";
import { useMyUserId } from "@/features/matching/hooks";
import { queryClient } from "@/lib/query-client";
import { ACTIVITY_LABELS, colors, spacing, typography } from "@/theme/tokens";

/** 보관함·하이라이트에서 여는 단일 포스트 뷰어 (피드 캐시와 무관, 만료 글도 열람) */
export default function PostViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useMyUserId();
  const { data: post, isLoading } = usePostById(id ?? "");
  const { mutate: toggleHighlight, isPending: toggling } = useToggleHighlight();
  const { mutateAsync: removePost, isPending: deleting } = useDeletePost();

  if (isLoading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  if (!post) {
    return (
      <Screen>
        <EmptyState emoji="🗂️" title="기록을 찾을 수 없어요" />
      </Screen>
    );
  }

  const mine = post.authorId === myId;
  const expired = new Date(post.expiresAt).getTime() <= Date.now();

  const confirmDelete = () =>
    Alert.alert("포스트 삭제", "이 기록을 삭제할까요? 되돌릴 수 없어요.", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await removePost(post.id);
            queryClient.invalidateQueries({ queryKey: ["my-posts"] });
            queryClient.invalidateQueries({ queryKey: ["highlights"] });
            router.back();
          } catch (e) {
            Alert.alert("삭제 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
          }
        },
      },
    ]);

  return (
    <Screen>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.nickname}>{post.nickname}</Text>
          <View style={styles.headerTags}>
            {post.highlighted ? <Tag label="⭐ 하이라이트" tone="accent" /> : null}
            {expired ? <Tag label="지난 기록" /> : null}
          </View>
        </View>
        {post.placeName ? <Text style={styles.place}>📍 {post.placeName}</Text> : null}
        <Text style={styles.body}>{post.body}</Text>
        {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.image} /> : null}
        <View style={styles.tags}>
          {post.activity ? <Tag label={ACTIVITY_LABELS[post.activity]} tone="accent" /> : null}
          {post.tags.map((t) => (
            <Tag key={t} label={`#${t}`} />
          ))}
        </View>
        <Text style={styles.meta}>{new Date(post.createdAt).toLocaleString("ko-KR")}</Text>
      </Card>

      {mine ? (
        <View style={styles.actions}>
          <Button
            label={post.highlighted ? "⭐ 하이라이트 해제" : "⭐ 하이라이트로 지정"}
            variant={post.highlighted ? "secondary" : "primary"}
            onPress={() => toggleHighlight({ postId: post.id, highlighted: !post.highlighted })}
            loading={toggling}
          />
          <Button label="삭제" variant="danger" onPress={confirmDelete} loading={deleting} />
        </View>
      ) : null}

      {mine ? (
        <Text style={styles.hint}>
          하이라이트로 지정하면 프로필 상단에 고정되고, 기간이 지나도 다른 사람이 볼 수 있어요.
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  card: { marginTop: spacing.md, gap: spacing.sm + 4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTags: { flexDirection: "row", gap: spacing.xs + 2 },
  nickname: { ...typography.heading, color: colors.text },
  place: { ...typography.caption, color: colors.accent, fontWeight: "700" },
  body: { ...typography.body, fontSize: 17, color: colors.text, lineHeight: 26 },
  image: { width: "100%", height: 240, borderRadius: 12 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
  meta: { ...typography.caption, color: colors.subtext },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  hint: {
    ...typography.caption,
    color: colors.subtext,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 18,
  },
});
