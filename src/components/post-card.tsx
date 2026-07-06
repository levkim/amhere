import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { useToggleHelpful } from "@/features/feed/hooks";
import type { Post } from "@/features/feed/types";
import { ACTIVITY_LABELS, colors, radius, spacing, typography } from "@/theme/tokens";

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}분 전`;
  return `${Math.round(mins / 60)}시간 전`;
}

function distanceLabel(m: number): string {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

export function HelpfulButton({ post }: { post: Post }) {
  const { mutate: toggle, isPending } = useToggleHelpful();
  return (
    <Pressable
      onPress={() => toggle({ postId: post.id, iHelped: post.iHelped })}
      disabled={isPending}
      style={[styles.helpful, post.iHelped && styles.helpfulActive]}
      hitSlop={8}
    >
      <Text style={[styles.helpfulText, post.iHelped && styles.helpfulTextActive]}>
        👍 도움됐어요 {post.helpfulCount > 0 ? post.helpfulCount : ""}
      </Text>
    </Pressable>
  );
}

export function PostCard({ post }: { post: Post }) {
  return (
    <Card onPress={() => router.push(`/post/${post.id}`)} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.nickname}>{post.nickname}</Text>
        <Text style={styles.meta}>
          {distanceLabel(post.distanceM)} · {timeAgo(post.createdAt)}
        </Text>
      </View>
      <Text style={styles.body}>{post.body}</Text>
      {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.image} /> : null}
      <View style={styles.footer}>
        <View style={styles.tags}>
          {post.activity ? <Tag label={ACTIVITY_LABELS[post.activity]} tone="accent" /> : null}
          {post.tags.map((t) => (
            <Tag key={t} label={`#${t}`} />
          ))}
        </View>
        <HelpfulButton post={post} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm + 4 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  nickname: { ...typography.heading, color: colors.text },
  meta: { ...typography.caption, color: colors.subtext },
  body: { ...typography.body, color: colors.text, lineHeight: 22 },
  image: { width: "100%", height: 180, borderRadius: 12, marginTop: spacing.sm + 4 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: spacing.sm + 4,
    gap: spacing.sm,
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2, flex: 1 },
  helpful: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  helpfulActive: { backgroundColor: "rgba(52, 211, 153, 0.15)", borderColor: colors.accent },
  helpfulText: { ...typography.caption, color: colors.subtext },
  helpfulTextActive: { color: colors.accent, fontWeight: "600" },
});
