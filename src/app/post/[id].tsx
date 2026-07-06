import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HelpfulButton, isCheckinPost, PostTags } from "@/components/post-card";
import { useDeletePost, useNearbyPosts } from "@/features/feed/hooks";
import { useMyUserId } from "@/features/matching/hooks";
import { colors, spacing, typography } from "@/theme/tokens";

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: posts } = useNearbyPosts();
  const myId = useMyUserId();
  const { mutateAsync: removePost, isPending: deleting } = useDeletePost();
  const post = posts?.find((p) => p.id === id);

  const confirmDelete = () => {
    if (!post) return;
    Alert.alert("포스트 삭제", "이 포스트를 삭제할까요? 되돌릴 수 없어요.", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await removePost(post.id);
            router.back();
          } catch (e) {
            Alert.alert("삭제 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
          }
        },
      },
    ]);
  };

  if (!post) {
    return (
      <Screen>
        <EmptyState
          emoji="⏳"
          title="사라진 포스트예요"
          description="포스트는 24시간 후 자동으로 만료돼요."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card style={[styles.card, isCheckinPost(post) && styles.checkinCard]}>
        {isCheckinPost(post) ? (
          <View style={styles.checkinBadge}>
            <Text style={styles.checkinBadgeText}>🏔️ 아웃도어 활동</Text>
          </View>
        ) : null}
        <Text style={styles.nickname}>{post.nickname}</Text>
        <Text style={styles.body}>{post.body}</Text>
        {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.image} /> : null}
        <View style={styles.tags}>
          <PostTags post={post} />
        </View>
        <Text style={styles.meta}>
          {new Date(post.createdAt).toLocaleString("ko-KR")} 작성 ·{" "}
          {new Date(post.expiresAt).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          만료
        </Text>
        <View style={styles.helpfulRow}>
          <HelpfulButton post={post} />
        </View>
      </Card>

      {/* 내 포스트면 삭제 */}
      {post.authorId === myId ? (
        <View style={styles.deleteBtn}>
          <Button label="포스트 삭제" variant="danger" onPress={confirmDelete} loading={deleting} />
        </View>
      ) : null}

      {/* 동행구함 체크인 포스트 → 바로 버디 요청 */}
      {post.authorId !== myId && post.tags.includes("동행구함") ? (
        <View style={styles.buddyBtn}>
          <Button
            label={`🤝 ${post.nickname}님에게 버디 요청 보내기`}
            onPress={() =>
              router.push({
                pathname: "/buddy/new",
                params: { userId: post.authorId, nickname: post.nickname },
              })
            }
          />
        </View>
      ) : null}

      {/* 내 포스트가 아니면 신고/차단 진입점 */}
      {post.authorId !== myId ? (
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/safety/report",
              params: { userId: post.authorId, nickname: post.nickname, postId: post.id },
            })
          }
          style={styles.reportLink}
        >
          <Text style={styles.reportText}>🚩 이 포스트 신고 / 작성자 차단</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md, gap: spacing.md },
  nickname: { ...typography.heading, color: colors.text },
  body: { ...typography.body, fontSize: 17, color: colors.text, lineHeight: 26 },
  image: { width: "100%", height: 240, borderRadius: 12 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
  meta: { ...typography.caption, color: colors.subtext },
  helpfulRow: { flexDirection: "row" },
  checkinCard: {
    borderColor: colors.accent,
    borderWidth: 1.5,
    backgroundColor: "rgba(52, 211, 153, 0.05)",
  },
  checkinBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  checkinBadgeText: { ...typography.caption, color: colors.accent, fontWeight: "600" },
  buddyBtn: { marginTop: spacing.lg },
  deleteBtn: { marginTop: spacing.lg },
  reportLink: { marginTop: spacing.lg, alignItems: "center", padding: spacing.md },
  reportText: { ...typography.caption, color: colors.subtext },
});
