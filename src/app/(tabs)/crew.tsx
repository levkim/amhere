import { FlatList, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCrews } from "@/features/crew/hooks";
import type { Crew } from "@/features/crew/api";
import { ACTIVITY_LABELS, colors, radius, spacing, typography } from "@/theme/tokens";

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

export default function CrewTab() {
  const { data: crews } = useCrews();

  return (
    <Screen padded={false} edges={["top"]}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  findCta: { marginBottom: spacing.md },
  crewCard: { marginBottom: spacing.sm + 4 },
  crewRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  crewEmoji: { fontSize: 34 },
  crewInfo: { flex: 1, gap: 3 },
  crewNameLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  crewName: { ...typography.heading, color: colors.text, flexShrink: 1 },
  crewMeta: { ...typography.caption, color: colors.subtext },
  crewDesc: { ...typography.body, color: colors.subtext, lineHeight: 20 },
});
