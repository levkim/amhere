import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useDeleteBuddyRequest,
  useMyBuddyRequests,
  useMyUserId,
  useRespondToRequest,
} from "@/features/matching/hooks";
import type { BuddyRequest } from "@/features/matching/types";
import { ACTIVITY_LABELS, colors, spacing, typography } from "@/theme/tokens";

const STATUS_LABELS: Record<BuddyRequest["status"], string> = {
  pending: "대기 중",
  accepted: "매칭 성사",
  declined: "거절됨",
  cancelled: "취소됨",
};

function RequestCard({ request }: { request: BuddyRequest }) {
  const myId = useMyUserId();
  const { mutate: respond, isPending } = useRespondToRequest();
  const { mutate: remove, isPending: removing } = useDeleteBuddyRequest();

  const incoming = request.addresseeId === myId;
  const counterpart = incoming ? request.requesterNickname : request.addresseeNickname;
  // 거절됨/취소됨 = 죽은 요청 → 목록에서 삭제 가능
  const deletable = request.status === "declined" || request.status === "cancelled";

  const onDelete = () => {
    Alert.alert("요청 삭제", "이 요청을 목록에서 삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => remove(request.id) },
    ]);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.nickname}>
          {counterpart} {incoming ? "" : "(보낸 요청)"}
        </Text>
        <View style={styles.headerRight}>
          <Tag
            label={STATUS_LABELS[request.status]}
            tone={request.status === "accepted" ? "accent" : "default"}
          />
          {deletable ? (
            <Pressable onPress={onDelete} disabled={removing} hitSlop={8} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>✕</Text>
            </Pressable>
          ) : null}
        </View>
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

export default function Buddies() {
  const { data: requests } = useMyBuddyRequests();

  return (
    <Screen padded={false} edges={["top"]}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  findCta: { marginBottom: spacing.md },
  card: { marginBottom: spacing.sm + 4, gap: spacing.sm },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { ...typography.caption, color: colors.subtext, fontWeight: "700" },
  nickname: { ...typography.heading, color: colors.text },
  meta: { ...typography.caption, color: colors.subtext },
  message: { ...typography.body, color: colors.text, lineHeight: 21 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: { flex: 1 },
});
