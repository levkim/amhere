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
  useJoinCrew,
  useLeaveCrew,
  useRespondCrewMember,
} from "@/features/crew/hooks";
import { useMyUserId } from "@/features/matching/hooks";
import type { CrewMember } from "@/features/crew/api";
import { ACTIVITY_LABELS, colors, spacing, typography } from "@/theme/tokens";

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
            <Text style={styles.sectionTitle}>멤버</Text>
          </>
        }
        ListFooterComponent={
          isMember && !isOwner ? (
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
  sectionTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
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
});
