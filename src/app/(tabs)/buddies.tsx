import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useMyBuddyRequests, useMyUserId, useRespondToRequest } from "@/features/matching/hooks";
import { useCrews } from "@/features/crew/hooks";
import type { BuddyRequest } from "@/features/matching/types";
import type { Crew } from "@/features/crew/api";
import { ACTIVITY_LABELS, colors, radius, spacing, typography } from "@/theme/tokens";

const STATUS_LABELS: Record<BuddyRequest["status"], string> = {
  pending: "대기 중",
  accepted: "매칭 성사",
  declined: "거절됨",
  cancelled: "취소됨",
};

function RequestCard({ request }: { request: BuddyRequest }) {
  const myId = useMyUserId();
  const { mutate: respond, isPending } = useRespondToRequest();

  const incoming = request.addresseeId === myId;
  const counterpart = incoming ? request.requesterNickname : request.addresseeNickname;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.nickname}>
          {counterpart} {incoming ? "" : "(보낸 요청)"}
        </Text>
        <Tag
          label={STATUS_LABELS[request.status]}
          tone={request.status === "accepted" ? "accent" : "default"}
        />
      </View>
      <Text style={styles.meta}>
        {ACTIVITY_LABELS[request.activity]} · {request.region} · {request.plannedDate}
      </Text>
      {request.message ? <Text style={styles.message}>{request.message}</Text> : null}

      {incoming && request.status === "pending" ? (
        <View style={styles.actions}>
          <View style={styles.actionBtn}>
            <Button
              label="수락"
              onPress={() => respond({ id: request.id, status: "accepted" })}
              loading={isPending}
            />
          </View>
          <View style={styles.actionBtn}>
            <Button
              label="거절"
              variant="secondary"
              onPress={() => respond({ id: request.id, status: "declined" })}
              disabled={isPending}
            />
          </View>
        </View>
      ) : null}

      {request.status === "accepted" ? (
        <Button
          label="채팅 열기"
          variant="secondary"
          onPress={() => router.push(`/chat/${request.id}`)}
        />
      ) : null}
    </Card>
  );
}

function CrewRow({ crew }: { crew: Crew }) {
  const statusLabel =
    crew.myStatus === "accepted" ? "가입됨" : crew.myStatus === "pending" ? "승인 대기" : null;
  return (
    <Card onPress={() => router.push(`/crew/${crew.id}`)} style={styles.crewCard}>
      <View style={styles.crewRow}>
        <Text style={styles.crewEmoji}>{crew.emoji}</Text>
        <View style={styles.crewInfo}>
          <View style={styles.crewNameLine}>
            <Text style={styles.crewName} numberOfLines={1}>
              {crew.name}
            </Text>
            {statusLabel ? <Tag label={statusLabel} tone="accent" /> : null}
          </View>
          <Text style={styles.crewMeta}>
            {crew.activity ? `${ACTIVITY_LABELS[crew.activity]} · ` : ""}
            {crew.region ? `${crew.region} · ` : ""}멤버 {crew.memberCount}명
            {crew.joinMode === "approval" ? " · 승인제" : ""}
          </Text>
          {crew.description ? (
            <Text style={styles.crewDesc} numberOfLines={2}>
              {crew.description}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

function CrewList() {
  const { data: crews } = useCrews();
  return (
    <FlatList
      data={crews}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => <CrewRow crew={item} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.findCta}>
          <Button label="⛰️ 크루 만들기" onPress={() => router.push("/crew/new")} />
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          emoji="⛰️"
          title="아직 크루가 없어요"
          description="첫 크루를 만들어 함께할 사람들을 모아보세요."
          ctaLabel="크루 만들기"
          onCta={() => router.push("/crew/new")}
        />
      }
    />
  );
}

function BuddyList() {
  const { data: requests } = useMyBuddyRequests();
  return (
    <FlatList
      data={requests}
      keyExtractor={(r) => r.id}
      renderItem={({ item }) => <RequestCard request={item} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.findCta}>
          <Button label="🔍 주변에서 버디 찾기" onPress={() => router.push("/buddy/find")} />
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          emoji="🤝"
          title="아직 버디 요청이 없어요"
          description="주변에서 같은 활동을 하는 사람을 찾아 요청을 보내보세요."
          ctaLabel="버디 찾기"
          onCta={() => router.push("/buddy/find")}
        />
      }
    />
  );
}

export default function Buddies() {
  const [tab, setTab] = useState<"buddy" | "crew">("buddy");

  return (
    <Screen padded={false} edges={["top"]}>
      {/* [버디 | 크루] 세그먼트 */}
      <View style={styles.segment}>
        {(
          [
            { key: "buddy", label: "🤝 버디" },
            { key: "crew", label: "⛰️ 크루" },
          ] as const
        ).map((s) => (
          <Pressable
            key={s.key}
            onPress={() => setTab(s.key)}
            style={[styles.segmentBtn, tab === s.key && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, tab === s.key && styles.segmentTextActive]}>
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "buddy" ? <BuddyList /> : <CrewList />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: "row",
    margin: spacing.md,
    marginBottom: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { ...typography.body, color: colors.subtext, fontWeight: "600" },
  segmentTextActive: { color: colors.invert, fontWeight: "700" },
  crewCard: { marginBottom: spacing.sm + 4 },
  crewRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  crewEmoji: { fontSize: 34 },
  crewInfo: { flex: 1, gap: 3 },
  crewNameLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  crewName: { ...typography.heading, color: colors.text, flexShrink: 1 },
  crewMeta: { ...typography.caption, color: colors.subtext },
  crewDesc: { ...typography.body, color: colors.subtext, lineHeight: 20 },
  list: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  findCta: { marginBottom: spacing.md },
  card: { marginBottom: spacing.sm + 4, gap: spacing.sm },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nickname: { ...typography.heading, color: colors.text },
  meta: { ...typography.caption, color: colors.subtext },
  message: { ...typography.body, color: colors.text, lineHeight: 21 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: { flex: 1 },
});
