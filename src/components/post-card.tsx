import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import type { Post } from "@/features/feed/types";
import { ACTIVITY_LABELS, colors, spacing, typography } from "@/theme/tokens";

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}분 전`;
  return `${Math.round(mins / 60)}시간 전`;
}

function distanceLabel(m: number): string {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
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
      <View style={styles.tags}>
        {post.activity ? <Tag label={ACTIVITY_LABELS[post.activity]} tone="accent" /> : null}
        {post.tags.map((t) => (
          <Tag key={t} label={`#${t}`} />
        ))}
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
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2, marginTop: spacing.sm + 4 },
});
