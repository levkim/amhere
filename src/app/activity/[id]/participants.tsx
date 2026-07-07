import { FlatList, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useParticipants, useRespondParticipant } from "@/features/activity/hooks";
import type { Participant } from "@/features/activity/api";
import { colors, spacing, typography } from "@/theme/tokens";

const STATUS: Record<Participant["status"], { label: string; tone: "accent" | "default" }> = {
  pending: { label: "대기 중", tone: "default" },
  accepted: { label: "참가 확정", tone: "accent" },
  declined: { label: "거절됨", tone: "default" },
  cancelled: { label: "취소됨", tone: "default" },
};

export default function Participants() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const checkInId = id ?? "";
  const { data: participants } = useParticipants(checkInId);
  const { mutate: respond, isPending } = useRespondParticipant(checkInId);

  return (
    <Screen padded={false}>
      <FlatList
        data={participants}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerBtns}>
            <Button
              label="💬 단체 채팅 열기"
              variant="secondary"
              onPress={() => router.push(`/activity/${checkInId}/chat`)}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.nickname}</Text>
              <Tag label={STATUS[item.status].label} tone={STATUS[item.status].tone} />
            </View>
            {item.status === "pending" ? (
              <View style={styles.actions}>
                <View style={styles.actionBtn}>
                  <Button
                    label="수락"
                    onPress={() => respond({ id: item.id, status: "accepted" })}
                    loading={isPending}
                  />
                </View>
                <View style={styles.actionBtn}>
                  <Button
                    label="거절"
                    variant="secondary"
                    onPress={() => respond({ id: item.id, status: "declined" })}
                    disabled={isPending}
                  />
                </View>
              </View>
            ) : null}
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            emoji="🙋"
            title="아직 참가신청이 없어요"
            description="'동행구함' 태그로 공유하면 앱 회원들이 참가신청할 수 있어요."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  headerBtns: { marginBottom: spacing.md },
  card: { marginBottom: spacing.sm + 4, gap: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { ...typography.heading, color: colors.text },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionBtn: { flex: 1 },
});
