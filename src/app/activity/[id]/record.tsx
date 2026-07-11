import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { EmptyState } from "@/components/ui/empty-state";
import { RouteMap } from "@/components/map/route-map";
import { useCheckIn } from "@/features/safety/history";
import { ACTIVITY_LABELS, colors, spacing, typography } from "@/theme/tokens";

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)}` : `${Math.round(m)}`;
}
function distanceUnit(m: number): string {
  return m >= 1000 ? "km" : "m";
}

function durationMins(startIso: string, endIso: string | null): number {
  if (!endIso) return 0;
  return Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000));
}

function durationLabel(mins: number): string {
  if (mins < 60) return `${mins}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

/** 평균 페이스(분/km) — 러닝·하이킹용 */
function paceLabel(distanceM: number, mins: number): string | null {
  if (distanceM < 100 || mins <= 0) return null;
  const pace = mins / (distanceM / 1000); // 분/km
  const pm = Math.floor(pace);
  const ps = Math.round((pace - pm) * 60);
  return `${pm}'${ps.toString().padStart(2, "0")}"/km`;
}

function Stat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ActivityRecord() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: record, isLoading } = useCheckIn(id);

  if (isLoading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  if (!record) {
    return (
      <Screen>
        <EmptyState emoji="🗺️" title="기록을 찾을 수 없어요" description="삭제되었거나 접근 권한이 없어요." />
      </Screen>
    );
  }

  const mins = durationMins(record.startedAt, record.completedAt);
  const hasTrack = record.track.length >= 2;
  const pace = hasTrack ? paceLabel(record.trackDistanceM, mins) : null;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>
          {record.locationName ? `📍 ${record.locationName}` : "📍 장소 미지정"}
        </Text>
        <Text style={styles.subtitle}>
          {ACTIVITY_LABELS[record.activity]}
          {record.completedAt
            ? ` · ${new Date(record.startedAt).toLocaleString("ko-KR", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : ""}
        </Text>
        {record.title ? <Text style={styles.recordTitle}>{record.title}</Text> : null}

        {hasTrack ? (
          <>
            <View style={styles.mapWrap}>
              <RouteMap track={record.track} height={300} />
            </View>
            <Card style={styles.statsCard}>
              <Stat
                value={formatDistance(record.trackDistanceM)}
                unit={distanceUnit(record.trackDistanceM)}
                label="이동 거리"
              />
              <View style={styles.divider} />
              <Stat value={durationLabel(mins)} label="소요 시간" />
              {pace ? (
                <>
                  <View style={styles.divider} />
                  <Stat value={pace} label="평균 페이스" />
                </>
              ) : null}
            </Card>
          </>
        ) : (
          <Card style={styles.noTrackCard}>
            <Text style={styles.noTrackEmoji}>🛰️</Text>
            <Text style={styles.noTrackText}>
              이 활동은 경로를 기록하지 않았어요.{"\n"}체크인할 때 "이동 경로 기록"을 켜면 지도로 남길 수 있어요.
            </Text>
            {mins > 0 ? <Text style={styles.noTrackMeta}>소요 시간 {durationLabel(mins)}</Text> : null}
          </Card>
        )}

        {record.tags.length > 0 ? (
          <View style={styles.tags}>
            {record.tags.map((t) => (
              <Tag key={t} label={`#${t}`} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  body: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.caption, color: colors.subtext },
  recordTitle: { ...typography.body, color: colors.text, marginTop: spacing.xs },
  mapWrap: { marginTop: spacing.sm },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: spacing.sm,
  },
  stat: { alignItems: "center", flex: 1 },
  statValue: { ...typography.title, color: colors.accent },
  statUnit: { ...typography.caption, color: colors.subtext },
  statLabel: { ...typography.caption, color: colors.subtext, marginTop: 2 },
  divider: { width: 1, alignSelf: "stretch", backgroundColor: colors.border, marginVertical: spacing.xs },
  noTrackCard: { alignItems: "center", gap: spacing.sm, marginTop: spacing.sm, paddingVertical: spacing.lg },
  noTrackEmoji: { fontSize: 32 },
  noTrackText: { ...typography.body, color: colors.subtext, textAlign: "center", lineHeight: 22 },
  noTrackMeta: { ...typography.caption, color: colors.text },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2, marginTop: spacing.sm },
});
