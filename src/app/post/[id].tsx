import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HelpfulButton, isCheckinPost, PostTags } from "@/components/post-card";
import { useDeletePost, useNearbyPosts } from "@/features/feed/hooks";
import { useMyUserId } from "@/features/matching/hooks";
import {
  useApplyToActivity,
  useCancelApplication,
  useParticipants,
} from "@/features/activity/hooks";
import { colors, spacing, typography } from "@/theme/tokens";

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: posts } = useNearbyPosts();
  const myId = useMyUserId();
  const { mutateAsync: removePost, isPending: deleting } = useDeletePost();
  const post = posts?.find((p) => p.id === id);

  // 참가신청 (동행구함 + 체크인 연결된 포스트만)
  const checkInId = post?.checkInId ?? "";
  const { data: participants } = useParticipants(checkInId);
  const { mutateAsync: apply, isPending: applying } = useApplyToActivity();
  const { mutateAsync: cancelApply } = useCancelApplication();
  const myParticipation = participants?.find((p) => p.userId === myId);

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
          description="포스트는 48시간 후 피드에서 내려가요. 내 글은 프로필에서 볼 수 있어요."
        />
      </Screen>
    );
  }

  // 연결된 체크인이 완료된 활동이면 '종료' 표기 + 노란 테두리 + 참가신청 차단
  const ended = isCheckinPost(post) && post.checkinStatus === "completed";

  return (
    <Screen>
      <Card
        style={[styles.card, isCheckinPost(post) && styles.checkinCard, ended && styles.endedCard]}
      >
        {isCheckinPost(post) ? (
          <View style={[styles.checkinBadge, ended && styles.endedBadge]}>
            <Text style={[styles.checkinBadgeText, ended && styles.endedBadgeText]}>
              {ended ? "🏁 아웃도어 활동 종료" : "🏔️ 아웃도어 활동"}
            </Text>
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

      {/* 동행구함 + 체크인 연결 → 참가신청 / 관리 / 단체 채팅 (종료된 활동은 신청 불가) */}
      {post.checkInId && post.tags.includes("동행구함") ? (
        <View style={styles.joinBox}>
          <Text style={styles.joinCount}>🙋 참가 확정 {post.joinedCount}명</Text>

          {ended ? (
            <>
              <Text style={styles.joinNote}>종료된 활동이라 참가신청을 받지 않아요.</Text>
              {post.authorId === myId || myParticipation?.status === "accepted" ? (
                <Button
                  label="💬 단체 채팅 열기"
                  variant="secondary"
                  onPress={() => router.push(`/activity/${post.checkInId}/chat`)}
                />
              ) : null}
            </>
          ) : post.authorId === myId ? (
            <>
              <Button
                label="참가신청 관리"
                onPress={() => router.push(`/activity/${post.checkInId}/participants`)}
              />
              <Button
                label="💬 단체 채팅 열기"
                variant="secondary"
                onPress={() => router.push(`/activity/${post.checkInId}/chat`)}
              />
            </>
          ) : myParticipation?.status === "accepted" ? (
            <>
              <Button
                label="💬 단체 채팅 열기"
                onPress={() => router.push(`/activity/${post.checkInId}/chat`)}
              />
              <Button
                label="참가 취소"
                variant="secondary"
                onPress={() =>
                  Alert.alert("참가 취소", "이 활동 참가를 취소할까요?", [
                    { text: "아니요", style: "cancel" },
                    {
                      text: "참가 취소",
                      style: "destructive",
                      onPress: () => cancelApply(checkInId),
                    },
                  ])
                }
              />
            </>
          ) : myParticipation?.status === "pending" ? (
            <>
              <Text style={styles.joinNote}>승인 대기 중이에요.</Text>
              <Button
                label="신청 취소"
                variant="secondary"
                onPress={() => cancelApply(checkInId)}
              />
            </>
          ) : myParticipation?.status === "declined" ? (
            <Text style={styles.joinNote}>참가가 거절되었어요.</Text>
          ) : (
            <Button
              label="🙋 참가신청"
              onPress={async () => {
                try {
                  await apply(checkInId);
                } catch (e) {
                  Alert.alert("신청 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
                }
              }}
              loading={applying}
            />
          )}
        </View>
      ) : post.authorId !== myId && post.tags.includes("동행구함") ? (
        // 체크인 연결이 없는 예전 동행구함 글은 기존 버디 요청으로
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
  // 종료된 활동: 노란(앰버) 테두리·배지 (피드 카드와 동일)
  endedCard: {
    borderColor: colors.amber,
    backgroundColor: "rgba(251, 191, 36, 0.06)",
  },
  endedBadge: { backgroundColor: "rgba(251, 191, 36, 0.16)" },
  endedBadgeText: { color: colors.amber },
  buddyBtn: { marginTop: spacing.lg },
  joinBox: { marginTop: spacing.lg, gap: spacing.sm },
  joinCount: { ...typography.body, color: colors.accent, fontWeight: "600" },
  joinNote: { ...typography.caption, color: colors.subtext, textAlign: "center" },
  deleteBtn: { marginTop: spacing.lg },
  reportLink: { marginTop: spacing.lg, alignItems: "center", padding: spacing.md },
  reportText: { ...typography.caption, color: colors.subtext },
});
