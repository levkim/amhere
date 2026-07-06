import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { EmptyState } from "@/components/ui/empty-state";
import { useNearbyPosts } from "@/features/feed/hooks";
import { ACTIVITY_LABELS, colors, spacing, typography } from "@/theme/tokens";

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: posts } = useNearbyPosts();
  const post = posts?.find((p) => p.id === id);

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
      <Card style={styles.card}>
        <Text style={styles.nickname}>{post.nickname}</Text>
        <Text style={styles.body}>{post.body}</Text>
        <View style={styles.tags}>
          {post.activity ? <Tag label={ACTIVITY_LABELS[post.activity]} tone="accent" /> : null}
          {post.tags.map((t) => (
            <Tag key={t} label={`#${t}`} />
          ))}
        </View>
        <Text style={styles.meta}>
          {new Date(post.createdAt).toLocaleString("ko-KR")} 작성 ·{" "}
          {new Date(post.expiresAt).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          만료
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md, gap: spacing.md },
  nickname: { ...typography.heading, color: colors.text },
  body: { ...typography.body, fontSize: 17, color: colors.text, lineHeight: 26 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
  meta: { ...typography.caption, color: colors.subtext },
});
