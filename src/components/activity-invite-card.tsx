import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useActivityCard } from "@/features/activity/invite";
import { ACTIVITY_LABELS, colors, radius, spacing, typography } from "@/theme/tokens";

const ACTIVITY_EMOJI: Record<string, string> = {
  ski: "⛷️", snowboard: "🏂", backcountry: "🏔️", hiking: "🥾",
  trekking: "🎒", running: "🏃", mtb: "🚵", cycling: "🚴",
};

function whenLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
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

/** 채팅에 공유된 활동 초대 카드 — 탭하면 활동 상세로 이동해 참가신청 */
export function ActivityInviteCard({ postId, mine }: { postId: string; mine: boolean }) {
  const { data: card, isLoading } = useActivityCard(postId);

  if (isLoading) {
    return (
      <View style={styles.card}>
        <Text style={styles.loading}>활동 불러오는 중…</Text>
      </View>
    );
  }
  if (!card) {
    return (
      <View style={styles.card}>
        <Text style={styles.gone}>🏔️ 사라졌거나 볼 수 없는 활동이에요</Text>
      </View>
    );
  }

  const ended = card.status === "completed";
  const active = card.status === "active";
  const badge = ended ? "종료" : active ? "진행중" : "예약";

  return (
    <Pressable
      onPress={() => router.push(`/post/${postId}`)}
      style={[styles.card, ended && styles.cardEnded, mine && styles.cardMine]}
    >
      <View style={styles.head}>
        <Text style={styles.invite}>🏔️ 아웃도어 활동 초대</Text>
        <View style={[styles.badge, ended && styles.badgeEnded, active && styles.badgeActive]}>
          <Text style={[styles.badgeText, ended && styles.badgeTextEnded, active && styles.badgeTextActive]}>
            {badge}
          </Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {card.activity ? `${ACTIVITY_EMOJI[card.activity] ?? "📍"} ` : ""}
        {card.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        📍 {card.placeName ?? "장소 미정"}
        {card.scheduledStartAt ? ` · ⏱ ${whenLabel(card.scheduledStartAt)}` : ""}
      </Text>
      <Text style={[styles.cta, ended && styles.ctaEnded]}>
        {ended ? "종료된 활동이에요" : "참가하러 가기 →"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 230,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.accent,
    padding: spacing.md,
    gap: 4,
  },
  cardMine: { backgroundColor: colors.surfaceHigh },
  cardEnded: { borderColor: colors.amber },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  invite: { ...typography.caption, color: colors.accent, fontWeight: "800" },
  badge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  badgeActive: { backgroundColor: "rgba(59,130,246,0.18)" },
  badgeEnded: { backgroundColor: "rgba(251,191,36,0.18)" },
  badgeText: { ...typography.caption, color: colors.accent, fontWeight: "800", fontSize: 11 },
  badgeTextActive: { color: colors.primary },
  badgeTextEnded: { color: colors.amber },
  title: { ...typography.body, color: colors.text, fontWeight: "800", marginTop: 2 },
  meta: { ...typography.caption, color: colors.subtext },
  cta: { ...typography.caption, color: colors.accent, fontWeight: "700", marginTop: 4 },
  ctaEnded: { color: colors.muted },
  loading: { ...typography.caption, color: colors.subtext },
  gone: { ...typography.caption, color: colors.muted },
});
