import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/profile-bits";
import {
  useCrew,
  useCrewMembers,
  useCrewPosts,
  useDisbandCrew,
  useJoinCrew,
  useKickCrewMember,
  useLeaveCrew,
  useRespondCrewMember,
} from "@/features/crew/hooks";
import { useMyUserId } from "@/features/matching/hooks";
import type { CrewMember, CrewPost } from "@/features/crew/api";
import { ACTIVITY_LABELS, colors, radius, spacing, typography } from "@/theme/tokens";

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}분 전`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h}시간 전` : `${Math.round(h / 24)}일 전`;
}

function CrewActivityRow({ post }: { post: CrewPost }) {
  return (
    <View style={styles.actRow}>
      <Avatar url={post.avatarUrl} size={36} />
      <View style={styles.actInfo}>
        <Text style={styles.actHead}>
          <Text style={styles.actName}>{post.nickname}</Text>
          <Text style={styles.actTime}> · {timeAgo(post.createdAt)}</Text>
        </Text>
        {post.placeName ? <Text style={styles.actPlace}>📍 {post.placeName}</Text> : null}
        <Text style={styles.actBody} numberOfLines={3}>
          {post.body}
        </Text>
      </View>
    </View>
  );
}

function CrewActivity({ crewId }: { crewId: string }) {
  const { data: posts } = useCrewPosts(crewId);
  if (!posts || posts.length === 0) {
    return (
      <Text style={styles.noActivity}>
        아직 크루 활동이 없어요. 체크인·포스트를 &lsquo;크루 활동으로&rsquo; 올려보세요.
      </Text>
    );
  }
  return (
    <Card style={styles.actCard}>
      {posts.slice(0, 5).map((p) => (
        <CrewActivityRow key={p.id} post={p} />
      ))}
    </Card>
  );
}

function MemberRow({
  member,
  isOwnerView,
  crewId,
}: {
  member: CrewMember;
  isOwnerView: boolean;
  crewId: string;
}) {
  const { mutate: respond, isPending } = useRespondCrewMember(crewId);
  const { mutate: kick, isPending: kicking } = useKickCrewMember(crewId);

  const confirmKick = () =>
    Alert.alert("멤버 내보내기", `${member.nickname}님을 크루에서 내보낼까요?`, [
      { text: "취소", style: "cancel" },
      { text: "내보내기", style: "destructive", onPress: () => kick(member.userId) },
    ]);

  return (
    <View style={styles.memberRow}>
      <Avatar url={member.avatarUrl} size={40} />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName} numberOfLines={1}>
          {member.role === "owner" ? "👑 " : ""}
          {member.nickname}
        </Text>
        {member.status === "pending" ? <Text style={styles.pending}>승인 대기</Text> : null}
      </View>
      {isOwnerView && member.status === "pending" ? (
        <View style={styles.memberActions}>
          <View style={styles.memberBtn}>
            <Button
              label="수락"
              onPress={() => respond({ userId: member.userId, status: "accepted" })}
              loading={isPending}
            />
          </View>
          <View style={styles.memberBtn}>
            <Button
              label="거절"
              variant="secondary"
              onPress={() => respond({ userId: member.userId, status: "declined" })}
              disabled={isPending}
            />
          </View>
        </View>
      ) : null}
      {isOwnerView && member.role !== "owner" && member.status === "accepted" ? (
        <Text style={styles.kick} onPress={kicking ? undefined : confirmKick}>
          내보내기
        </Text>
      ) : null}
    </View>
  );
}

export default function CrewHome() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const crewId = id ?? "";
  const crew = useCrew(crewId);
  const myId = useMyUserId();
  const { data: members } = useCrewMembers(crewId);
  const { mutateAsync: join, isPending: joining } = useJoinCrew();
  const { mutateAsync: leave } = useLeaveCrew();
  const { mutateAsync: disband, isPending: disbanding } = useDisbandCrew();

  if (!crew) {
    return (
      <Screen>
        <EmptyState emoji="⛰️" title="크루를 찾을 수 없어요" />
      </Screen>
    );
  }

  const isOwner = crew.ownerId === myId;
  const isMember = crew.myStatus === "accepted";
  const isPendingMe = crew.myStatus === "pending";

  const doJoin = async () => {
    try {
      await join({ crewId: crew.id, joinMode: crew.joinMode });
    } catch (e) {
      Alert.alert("가입 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    }
  };

  const confirmLeave = () =>
    Alert.alert("크루 탈퇴", `${crew.name}에서 나갈까요?`, [
      { text: "취소", style: "cancel" },
      { text: "탈퇴", style: "destructive", onPress: () => leave(crew.id) },
    ]);

  // 크루장 외 수락된 멤버 수 — 0명일 때만 폭파 가능 (서버 트리거도 같은 조건 강제)
  const otherMembers = (members ?? []).filter(
    (m) => m.userId !== myId && m.status === "accepted",
  ).length;

  const confirmDisband = () => {
    if (otherMembers > 0) {
      Alert.alert(
        "아직 폭파할 수 없어요",
        `멤버 ${otherMembers}명이 남아있어요.\n모든 멤버가 나가거나 내보낸 후에 폭파할 수 있어요.`,
      );
      return;
    }
    Alert.alert(
      "💥 크루 폭파",
      `${crew.name} 크루를 폭파할까요?\n크루 채팅 기록이 모두 삭제되며 되돌릴 수 없어요.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "폭파",
          style: "destructive",
          onPress: async () => {
            try {
              await disband(crew.id);
              router.back();
            } catch (e) {
              Alert.alert("폭파 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
            }
          },
        },
      ],
    );
  };

  return (
    <Screen padded={false}>
      <FlatList
        data={members}
        keyExtractor={(m) => m.userId}
        renderItem={({ item }) => (
          <MemberRow member={item} isOwnerView={isOwner} crewId={crewId} />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Card style={styles.headerCard}>
              <Text style={styles.emoji}>{crew.emoji}</Text>
              <Text style={styles.name}>{crew.name}</Text>
              <Text style={styles.meta}>
                {crew.activity ? `${ACTIVITY_LABELS[crew.activity]} · ` : ""}
                {crew.region ? `${crew.region} · ` : ""}멤버 {crew.memberCount}명
              </Text>
              {crew.description ? <Text style={styles.desc}>{crew.description}</Text> : null}
              <View style={styles.badges}>
                <Tag
                  label={crew.joinMode === "open" ? "🌐 바로 가입" : "✋ 승인제"}
                  tone="default"
                />
                {isOwner ? <Tag label="내가 크루장" tone="accent" /> : null}
              </View>

              {isMember ? (
                <Button
                  label="💬 크루 채팅"
                  onPress={() => router.push(`/crew/${crew.id}/chat`)}
                />
              ) : isPendingMe ? (
                <Text style={styles.pendingNote}>가입 승인을 기다리는 중이에요.</Text>
              ) : (
                <Button
                  label={crew.joinMode === "open" ? "크루 가입하기" : "가입 신청하기"}
                  onPress={doJoin}
                  loading={joining}
                />
              )}
            </Card>

            {isMember ? (
              <>
                <Text style={styles.sectionTitle}>크루 활동</Text>
                <CrewActivity crewId={crewId} />
              </>
            ) : null}

            <Text style={styles.sectionTitle}>멤버</Text>
          </>
        }
        ListFooterComponent={
          isOwner ? (
            <View style={styles.disbandWrap}>
              <Text style={styles.disband} onPress={disbanding ? undefined : confirmDisband}>
                💥 크루 폭파
              </Text>
              {otherMembers > 0 ? (
                <Text style={styles.disbandHint}>
                  멤버 {otherMembers}명이 모두 나간 후에 폭파할 수 있어요.
                </Text>
              ) : (
                <Text style={styles.disbandHint}>
                  폭파하면 크루와 채팅 기록이 삭제되며 되돌릴 수 없어요.
                </Text>
              )}
            </View>
          ) : isMember ? (
            <Text style={styles.leave} onPress={confirmLeave}>
              크루 탈퇴
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.noMembers}>아직 멤버가 없어요.</Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  headerCard: { gap: spacing.sm, alignItems: "center", marginBottom: spacing.lg },
  emoji: { fontSize: 52 },
  name: { ...typography.title, color: colors.text, textAlign: "center" },
  meta: { ...typography.caption, color: colors.subtext },
  desc: {
    ...typography.body,
    color: colors.subtext,
    lineHeight: 21,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  badges: { flexDirection: "row", gap: spacing.sm, marginVertical: spacing.sm },
  pendingNote: { ...typography.body, color: colors.warn, marginTop: spacing.sm },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  actCard: { gap: spacing.md, marginBottom: spacing.md },
  actRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  actInfo: { flex: 1, gap: 2 },
  actHead: { ...typography.caption },
  actName: { color: colors.text, fontWeight: "700" },
  actTime: { color: colors.subtext },
  actPlace: { ...typography.caption, color: colors.accent, fontWeight: "700" },
  actBody: { ...typography.body, color: colors.text, lineHeight: 20 },
  noActivity: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
    paddingVertical: spacing.md,
    lineHeight: 20,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  memberInfo: { flex: 1 },
  memberName: { ...typography.body, fontWeight: "600", color: colors.text },
  pending: { ...typography.caption, color: colors.warn },
  memberActions: { flexDirection: "row", gap: spacing.sm },
  memberBtn: { width: 76 },
  noMembers: { ...typography.body, color: colors.subtext, textAlign: "center" },
  leave: {
    ...typography.body,
    color: colors.danger,
    textAlign: "center",
    padding: spacing.md,
    marginTop: spacing.md,
  },
  kick: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  disbandWrap: { marginTop: spacing.lg, alignItems: "center", gap: spacing.xs },
  disband: {
    ...typography.body,
    color: colors.danger,
    fontWeight: "700",
    padding: spacing.sm,
  },
  disbandHint: {
    ...typography.caption,
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    lineHeight: 17,
  },
});
