import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { useToggleHelpful } from "@/features/feed/hooks";
import { useMyUserId } from "@/features/matching/hooks";
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

/** 아웃도어 체크인으로 공유된 포스트인지 */
export function isCheckinPost(post: Post): boolean {
  return post.tags.includes("체크인");
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

/** 포스트 태그 줄 — #동행구함은 탭하면 바로 버디 요청으로 연결 */
export function PostTags({ post }: { post: Post }) {
  const myId = useMyUserId();
  return (
    <>
      {post.activity ? <Tag label={ACTIVITY_LABELS[post.activity]} tone="accent" /> : null}
      {post.tags.map((t) =>
        t === "동행구함" && post.authorId !== myId ? (
          <Pressable
            key={t}
            onPress={() =>
              router.push({
                pathname: "/buddy/new",
                params: { userId: post.authorId, nickname: post.nickname },
              })
            }
            hitSlop={6}
          >
            <Tag label={`🤝 #${t} → 요청`} tone="accent" />
          </Pressable>
        ) : (
          <Tag key={t} label={`#${t}`} />
        ),
      )}
    </>
  );
}

export function PostCard({ post }: { post: Post }) {
  const checkin = isCheckinPost(post);
  // 연결된 체크인이 완료된 활동이면 '종료'로 표기하고 테두리를 노란색으로 구분한다.
  const ended = checkin && post.checkinStatus === "completed";
  return (
    <Card
      onPress={() => router.push(`/post/${post.id}`)}
      style={[styles.card, checkin && styles.checkinCard, ended && styles.endedCard]}
    >
      {checkin ? (
        <View style={[styles.checkinBadge, ended && styles.endedBadge]}>
          <Text style={[styles.checkinBadgeText, ended && styles.endedBadgeText]}>
            {ended ? "🏁 아웃도어 활동 종료" : "🏔️ 아웃도어 활동"}
          </Text>
        </View>
      ) : null}
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <Text style={styles.nickname}>{post.nickname}</Text>
          {post.visibility === "friends" ? <Text style={styles.friendsOnly}>🤝 친구공개</Text> : null}
        </View>
        <Text style={styles.meta}>
          {distanceLabel(post.distanceM)} · {timeAgo(post.createdAt)}
        </Text>
      </View>
      {post.placeName ? <Text style={styles.place}>📍 {post.placeName}</Text> : null}
      <Text style={styles.body}>{post.body}</Text>
      {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.image} /> : null}
      <View style={styles.footer}>
        <View style={styles.tags}>
          <PostTags post={post} />
        </View>
        <HelpfulButton post={post} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm + 4 },
  // 아웃도어 활동(체크인) 포스트는 초록 테두리로 구분
  checkinCard: {
    borderColor: colors.accent,
    borderWidth: 1.5,
    backgroundColor: "rgba(52, 211, 153, 0.05)",
  },
  checkinBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    marginBottom: spacing.sm,
  },
  checkinBadgeText: { ...typography.caption, color: colors.accent, fontWeight: "600" },
  // 종료된 활동: 노란(앰버) 테두리·배지로 구분
  endedCard: {
    borderColor: colors.amber,
    backgroundColor: "rgba(251, 191, 36, 0.06)",
  },
  endedBadge: { backgroundColor: "rgba(251, 191, 36, 0.16)" },
  endedBadgeText: { color: colors.amber },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  nickname: { ...typography.heading, color: colors.text },
  friendsOnly: { ...typography.caption, color: colors.accent },
  meta: { ...typography.caption, color: colors.subtext },
  place: { ...typography.caption, color: colors.accent, fontWeight: "700", marginBottom: 4 },
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
