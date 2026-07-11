import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { Post } from "@/features/feed/types";
import { ACTIVITY_LABELS, colors, radius, spacing, typography } from "@/theme/tokens";

const ACTIVITY_EMOJI: Record<string, string> = {
  ski: "⛷️",
  snowboard: "🏂",
  backcountry: "🏔️",
  hiking: "🥾",
  trekking: "🎒",
  running: "🏃",
  mtb: "🚵",
  cycling: "🚴",
};

/** D-day + 요일/시각 라벨 */
function whenLabel(iso: string): string {
  const start = new Date(iso);
  const now = new Date();
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dDay = Math.round((startDay.getTime() - today.getTime()) / 86_400_000);
  const time = start.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  const dow = ["일", "월", "화", "수", "목", "금", "토"][start.getDay()];
  const prefix = dDay === 0 ? "오늘" : dDay === 1 ? "내일" : `D-${dDay} ${dow}`;
  return `${prefix} ${time}`;
}

/** 예약(scheduled) 상태 체크인만 시작 시간 순으로 상단에 노출.
 *  활동이 시작되어 진행중(active)으로 바뀌면 여기서 사라진다. */
export function UpcomingActivities({ posts }: { posts: Post[] }) {
  const now = Date.now();
  const upcoming = posts
    .filter(
      (p) =>
        p.scheduledStartAt !== null &&
        new Date(p.scheduledStartAt).getTime() > now &&
        // 예약 상태일 때만 노출 — 진행중/완료로 바뀌면 제외
        p.checkinStatus === "scheduled",
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledStartAt!).getTime() - new Date(b.scheduledStartAt!).getTime(),
    );

  if (upcoming.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>⏱ 다가오는 활동</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {upcoming.map((p) => {
            const place = p.checkinLocation ?? p.placeName;
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/post/${p.id}`)}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.reservedLabel}>🗓 아웃도어 활동 예약</Text>
                <View style={styles.cardTop}>
                  <Text style={styles.emoji}>
                    {p.activity ? (ACTIVITY_EMOJI[p.activity] ?? "📍") : "📍"}
                  </Text>
                  <Text style={styles.when}>{whenLabel(p.scheduledStartAt!)}</Text>
                </View>
                {p.checkinTitle ? (
                  <Text style={styles.checkinTitle} numberOfLines={1}>
                    {p.checkinTitle}
                  </Text>
                ) : null}
                <Text style={styles.place} numberOfLines={1}>
                  📍 {place ?? "장소 미정"}
                </Text>
                <Text style={styles.act} numberOfLines={1}>
                  {p.activity ? ACTIVITY_LABELS[p.activity] : ""}
                </Text>
                <Text style={styles.joined}>
                  🙋 참가 {p.joinedCount}명{p.tags.includes("동행구함") ? " · 동행구함" : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: spacing.sm },
  title: { ...typography.heading, color: colors.text, paddingHorizontal: spacing.md },
  row: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md },
  card: {
    width: 168,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.md,
    gap: 3,
  },
  reservedLabel: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "800",
    marginBottom: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  emoji: { fontSize: 22 },
  when: { ...typography.caption, color: colors.accent, fontWeight: "800" },
  checkinTitle: { ...typography.body, color: colors.text, fontWeight: "700" },
  place: { ...typography.caption, color: colors.subtext, fontWeight: "600" },
  act: { ...typography.caption, color: colors.subtext },
  joined: { ...typography.caption, color: colors.subtext, marginTop: 2 },
});
