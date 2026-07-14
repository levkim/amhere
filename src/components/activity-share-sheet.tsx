import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  formatActivityInvite,
  useMyShareableActivities,
  type ShareableActivity,
} from "@/features/activity/invite";
import { ACTIVITY_LABELS, colors, radius, spacing, typography } from "@/theme/tokens";

function whenLabel(a: ShareableActivity): string {
  if (a.status === "active") return "진행중";
  if (!a.scheduledStartAt) return "예약";
  const d = new Date(a.scheduledStartAt);
  const now = new Date();
  const dDay = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86_400_000,
  );
  const time = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  const prefix = dDay === 0 ? "오늘" : dDay === 1 ? "내일" : `${d.getMonth() + 1}/${d.getDate()}`;
  return `${prefix} ${time}`;
}

/** 채팅 입력창의 ➕에서 열리는 활동 공유 시트 */
export function ActivityShareSheet({
  visible,
  onClose,
  onShare,
}: {
  visible: boolean;
  onClose: () => void;
  onShare: (body: string) => void;
}) {
  const { data: activities, isLoading } = useMyShareableActivities();

  const pick = (a: ShareableActivity) => {
    onShare(formatActivityInvite(a.postId));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>활동 공유</Text>
        <Text style={styles.sub}>진행 예정이거나 진행 중인 내 활동을 채팅에 공유해요.</Text>

        <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.sm }}>
          {isLoading ? (
            <Text style={styles.empty}>불러오는 중…</Text>
          ) : !activities || activities.length === 0 ? (
            <Text style={styles.empty}>
              공유할 활동이 없어요.{"\n"}동행을 구하는 아웃도어 활동을 시작하면 여기에 나타나요.
            </Text>
          ) : (
            activities.map((a) => (
              <Pressable key={a.postId} onPress={() => pick(a)} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowHead}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {a.title}
                    </Text>
                    <View style={[styles.tag, a.status === "active" && styles.tagActive]}>
                      <Text style={[styles.tagText, a.status === "active" && styles.tagTextActive]}>
                        {a.status === "active" ? "진행중" : "예약"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {a.activity ? `${ACTIVITY_LABELS[a.activity]} · ` : ""}
                    📍 {a.placeName ?? "장소 미정"} · ⏱ {whenLabel(a)}
                  </Text>
                </View>
                <Text style={styles.share}>공유</Text>
              </Pressable>
            ))
          )}
        </ScrollView>

        <Pressable onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>닫기</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: "72%",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: "center", marginBottom: spacing.md,
  },
  title: { ...typography.title, fontSize: 20, color: colors.text },
  sub: { ...typography.caption, color: colors.subtext, marginTop: 2, marginBottom: spacing.md },
  list: { maxHeight: 380 },
  empty: {
    ...typography.body, color: colors.subtext, textAlign: "center",
    paddingVertical: spacing.xl, lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rowHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowTitle: { ...typography.body, color: colors.text, fontWeight: "700", flexShrink: 1 },
  rowMeta: { ...typography.caption, color: colors.subtext, marginTop: 2 },
  tag: {
    backgroundColor: colors.accentSoft, borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 1,
  },
  tagActive: { backgroundColor: "rgba(59,130,246,0.18)" },
  tagText: { ...typography.caption, color: colors.accent, fontWeight: "800", fontSize: 11 },
  tagTextActive: { color: colors.primary },
  share: { ...typography.caption, color: colors.accent, fontWeight: "800" },
  close: { alignItems: "center", paddingVertical: spacing.md, marginTop: spacing.sm },
  closeText: { ...typography.body, color: colors.subtext },
});
