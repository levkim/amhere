import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { EmptyState } from "@/components/ui/empty-state";
import { useMyCheckIns, type CheckInRecord } from "@/features/safety/history";
import { ACTIVITY_LABELS, colors, spacing, typography } from "@/theme/tokens";

const STATUS_LABELS: Record<CheckInRecord["status"], { label: string; tone: "accent" | "default" }> = {
  active: { label: "진행 중", tone: "accent" },
  completed: { label: "완료", tone: "default" },
  overdue: { label: "시간 초과", tone: "default" },
  alerted: { label: "알림 발송됨", tone: "default" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 완료된 활동의 소요 시간 */
function durationLabel(record: CheckInRecord): string | null {
  if (!record.completedAt) return null;
  const mins = Math.round(
    (new Date(record.completedAt).getTime() - new Date(record.startedAt).getTime()) / 60_000,
  );
  if (mins < 60) return `${mins}분 활동`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}시간 ${m}분 활동` : `${h}시간 활동`;
}

function RecordCard({ record }: { record: CheckInRecord }) {
  const status = STATUS_LABELS[record.status];
  const duration = durationLabel(record);
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {record.locationName ? `📍 ${record.locationName}` : "📍 장소 미지정"}
        </Text>
        <Tag label={status.label} tone={status.tone} />
      </View>
      <Text style={styles.meta}>
        {ACTIVITY_LABELS[record.activity]} · {formatDate(record.startedAt)} 시작
        {duration ? ` · ${duration}` : ""}
      </Text>
      {record.tags.length > 0 ? (
        <View style={styles.tags}>
          {record.tags.map((t) => (
            <Tag key={t} label={`#${t}`} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/** 이번 달 횟수 + 전체 완료 활동 누적 시간 */
function summarize(records: CheckInRecord[]): { monthCount: number; totalHours: number } {
  const now = new Date();
  const monthCount = records.filter((r) => {
    const d = new Date(r.startedAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const totalMins = records.reduce((sum, r) => {
    if (!r.completedAt) return sum;
    return (
      sum + (new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()) / 60_000
    );
  }, 0);

  return { monthCount, totalHours: Math.round(totalMins / 60) };
}

export default function ActivityHistory() {
  const { data: records, isLoading } = useMyCheckIns();

  if (isLoading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={records}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <RecordCard record={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          records && records.length > 0 ? (
            <>
              <Card style={styles.statsCard}>
                {(() => {
                  const { monthCount, totalHours } = summarize(records);
                  return (
                    <Text style={styles.stats}>
                      이번 달 <Text style={styles.statsStrong}>{monthCount}회</Text> · 누적{" "}
                      <Text style={styles.statsStrong}>{totalHours}시간</Text> 활동 🏔️
                    </Text>
                  );
                })()}
              </Card>
              <Text style={styles.notice}>내 아웃도어 체크인 기록이에요. 나만 볼 수 있어요.</Text>
            </>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            emoji="📖"
            title="아직 활동 기록이 없어요"
            description="아웃도어 체크인을 시작하면 여기에 기록이 쌓여요."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  statsCard: { marginBottom: spacing.md, alignItems: "center" },
  stats: { ...typography.heading, color: colors.text },
  statsStrong: { color: colors.accent },
  notice: {
    ...typography.caption,
    color: colors.subtext,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  card: { marginBottom: spacing.sm + 4, gap: spacing.sm },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: { ...typography.heading, color: colors.text, flex: 1 },
  meta: { ...typography.caption, color: colors.subtext },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
});
