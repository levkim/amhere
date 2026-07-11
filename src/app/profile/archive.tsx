import { useMemo } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { useMyPosts, type MyPost } from "@/features/feed/my-posts";
import { useMyCheckIns, type CheckInRecord } from "@/features/safety/history";
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

type ArchiveItem =
  | { kind: "post"; when: string; post: MyPost }
  | { kind: "checkin"; when: string; record: CheckInRecord };

type MonthSection = { key: string; label: string; items: ArchiveItem[] };

/** 포스트+체크인을 월별로 묶는다 (최신 월부터) */
function buildSections(posts: MyPost[], checkins: CheckInRecord[]): MonthSection[] {
  const items: ArchiveItem[] = [
    ...posts.map((p) => ({ kind: "post" as const, when: p.createdAt, post: p })),
    ...checkins.map((r) => ({ kind: "checkin" as const, when: r.scheduledStartAt, record: r })),
  ].sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

  const map = new Map<string, MonthSection>();
  for (const it of items) {
    const d = new Date(it.when);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!map.has(key)) {
      map.set(key, { key, label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`, items: [] });
    }
    map.get(key)!.items.push(it);
  }
  return [...map.values()];
}

function Tile({ item }: { item: ArchiveItem }) {
  if (item.kind === "post") {
    const p = item.post;
    return (
      <Pressable
        onPress={() => router.push(`/post/view/${p.id}`)}
        style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}
      >
        {p.imageUrl ? (
          <Image source={{ uri: p.imageUrl }} style={styles.tileImage} />
        ) : (
          <View style={styles.tileTextWrap}>
            <Text style={styles.tileEmoji}>
              {p.activity ? (ACTIVITY_EMOJI[p.activity] ?? "📍") : "📍"}
            </Text>
            <Text style={styles.tileSnippet} numberOfLines={3}>
              {p.body}
            </Text>
          </View>
        )}
        {p.highlighted ? <Text style={styles.star}>⭐</Text> : null}
      </Pressable>
    );
  }
  const r = item.record;
  return (
    <View style={[styles.tile, styles.checkinTile]}>
      <Text style={styles.tileEmoji}>{ACTIVITY_EMOJI[r.activity] ?? "🏔️"}</Text>
      <Text style={styles.tileSnippet} numberOfLines={2}>
        {r.locationName ?? ACTIVITY_LABELS[r.activity]}
      </Text>
      <Text style={styles.tileDate}>
        {new Date(r.scheduledStartAt).toLocaleDateString("ko-KR", {
          month: "short",
          day: "numeric",
        })}{" "}
        체크인
      </Text>
    </View>
  );
}

export default function Archive() {
  const { data: posts } = useMyPosts();
  const { data: checkins } = useMyCheckIns();

  const sections = useMemo(
    () => buildSections(posts ?? [], checkins ?? []),
    [posts, checkins],
  );

  return (
    <Screen padded={false}>
      <FlatList
        data={sections}
        keyExtractor={(s) => s.key}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          sections.length > 0 ? (
            <Text style={styles.notice}>
              나의 모든 기록이에요. 포스트를 열어 ⭐ 하이라이트로 지정하면 프로필에 고정돼요.
            </Text>
          ) : null
        }
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <Text style={styles.month}>{section.label}</Text>
            <View style={styles.grid}>
              {section.items.map((it, i) => (
                <Tile key={i} item={it} />
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            emoji="🗂️"
            title="아직 기록이 없어요"
            description="포스트와 체크인이 쌓이면 여기에 월별로 정리돼요."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  notice: {
    ...typography.caption,
    color: colors.subtext,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  section: { marginBottom: spacing.lg },
  month: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: {
    width: "31.5%",
    aspectRatio: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  tileImage: { width: "100%", height: "100%" },
  tileTextWrap: { flex: 1, padding: 8, gap: 4 },
  checkinTile: { padding: 8, gap: 3, borderColor: colors.accentSoft, backgroundColor: colors.bgElevated },
  tileEmoji: { fontSize: 20 },
  tileSnippet: { ...typography.caption, color: colors.text, lineHeight: 15 },
  tileDate: { ...typography.caption, fontSize: 10, color: colors.subtext },
  star: { position: "absolute", top: 4, right: 6, fontSize: 14 },
});
