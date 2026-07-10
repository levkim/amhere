import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post-card";
import { NotificationBell } from "@/components/notification-bell";
import { LiveMap } from "@/components/map/live-map";
import { useNearbyPosts } from "@/features/feed/hooks";
import { useNearbyUsers } from "@/features/matching/hooks";
import { useCurrentLocation } from "@/features/location/use-current-location";
import { useSafetyStore } from "@/features/safety/hooks";
import { formatCountdown, useNow } from "@/features/safety/use-now";
import { useEffectiveCoords } from "@/stores/location";
import {
  ACTIVITY_LABELS,
  colors,
  radius,
  spacing,
  typography,
  type Activity,
} from "@/theme/tokens";

// 라이브 맵 (홈) — Mapbox 지도 위에 내 위치·주변 포스트·주변 사용자를 표시한다.
// 웹에서는 live-map.web.tsx의 안내 화면으로 대체된다 (Metro가 자동 선택).
export default function MapHome() {
  useCurrentLocation();

  const coords = useEffectiveCoords();
  const { data: posts } = useNearbyPosts();
  const { data: users } = useNearbyUsers();
  const activeCheckIn = useSafetyStore((s) => s.active);
  // 예약 카운트다운일 때만 1초 틱, 그 외엔 느리게 (배터리 절약)
  const now = useNow(activeCheckIn?.state === "scheduled" ? 1000 : 60_000);
  const [activityFilter, setActivityFilter] = useState<Activity | null>(null);

  const filteredPosts = useMemo(
    () => (activityFilter ? (posts ?? []).filter((p) => p.activity === activityFilter) : posts),
    [posts, activityFilter],
  );
  const filteredUsers = useMemo(
    () => (activityFilter ? (users ?? []).filter((u) => u.activity === activityFilter) : users),
    [users, activityFilter],
  );

  return (
    <Screen padded={false} edges={["top"]}>
      <View style={styles.mapWrap}>
        <LiveMap center={coords} posts={filteredPosts ?? []} users={filteredUsers ?? []} />
        {/* 활동 필터 (지도 위 오버레이) */}
        <View style={styles.filterOverlay}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterChips}>
              <Pressable
                onPress={() => setActivityFilter(null)}
                style={[styles.chip, activityFilter === null && styles.chipActive]}
              >
                <Text style={[styles.chipText, activityFilter === null && styles.chipTextActive]}>
                  전체
                </Text>
              </Pressable>
              {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((key) => (
                <Pressable
                  key={key}
                  onPress={() => setActivityFilter(activityFilter === key ? null : key)}
                  style={[styles.chip, activityFilter === key && styles.chipActive]}
                >
                  <Text style={[styles.chipText, activityFilter === key && styles.chipTextActive]}>
                    {ACTIVITY_LABELS[key]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
        {/* 알림함 (지도 우하단 플로팅) */}
        <View style={styles.bellWrap}>
          <NotificationBell floating />
        </View>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
        {/* 안전 체크인 배너 */}
        <Card
          style={[
            styles.safetyCard,
            activeCheckIn?.state === "scheduled" && styles.scheduledCard,
          ]}
        >
          {activeCheckIn?.state === "scheduled" ? (
            // 예약(미래 시작) 상태 — 빨간 테두리 + 시작까지 카운트다운
            <>
              <Text style={styles.scheduledLabel}>예약된 아웃도어 활동</Text>
              <Text style={styles.scheduledTitle}>
                {activeCheckIn.locationName ? `${activeCheckIn.locationName} · ` : ""}
                {ACTIVITY_LABELS[activeCheckIn.activity]}
              </Text>
              {activeCheckIn.title ? (
                <Text style={styles.safetyDesc}>{activeCheckIn.title}</Text>
              ) : null}
              <View style={styles.ring}>
                <Text style={styles.ringCaption}>시작까지</Text>
                <Text style={styles.ringValue}>
                  {formatCountdown(new Date(activeCheckIn.scheduledStartAt).getTime() - now)}
                </Text>
              </View>
              <View style={styles.safetyActions}>
                <View style={styles.safetyActionBtn}>
                  <Button
                    label="지금 시작"
                    onPress={() => useSafetyStore.getState().confirmStart()}
                  />
                </View>
                <View style={styles.safetyActionBtn}>
                  <Button
                    label="예약 취소"
                    variant="secondary"
                    onPress={() => useSafetyStore.getState().cancelScheduled()}
                  />
                </View>
              </View>
            </>
          ) : activeCheckIn ? (
            <>
              <Text style={styles.safetyTitle}>
                🟢 {activeCheckIn.locationName ? `${activeCheckIn.locationName} · ` : ""}
                {ACTIVITY_LABELS[activeCheckIn.activity]} 활동 중
              </Text>
              <Text style={styles.safetyDesc}>
                {new Date(activeCheckIn.expectedEndAt).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                까지 체크아웃하지 않으면 알림이 발송돼요. 늦어질 것 같으면 연장하세요.
              </Text>
              <View style={styles.safetyActions}>
                <View style={styles.safetyActionBtn}>
                  <Button
                    label="⏰ 1시간 연장"
                    variant="secondary"
                    onPress={() => useSafetyStore.getState().extend(1)}
                  />
                </View>
                <View style={styles.safetyActionBtn}>
                  <Button
                    label="활동 종료"
                    onPress={() => useSafetyStore.getState().complete()}
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.safetyTitle}>🛡️ 혼자 나가시나요?</Text>
              <Text style={styles.safetyDesc}>
                아웃도어 체크인을 시작하면 제시간에 돌아오지 않을때 자동으로 본인 및 등록한
                가족,버디에게 알람을 보내드려요
              </Text>
              <Button
                label="아웃도어 체크인 시작"
                onPress={() => router.push("/safety/check-in")}
              />
            </>
          )}
        </Card>

        {/* 주변 소식 미리보기 ('지금' = 예정 활동 제외) */}
        <Text style={styles.sectionTitle}>지금 주변에서</Text>
        {(posts ?? [])
          .filter(
            (p) =>
              !(p.scheduledStartAt && new Date(p.scheduledStartAt).getTime() > Date.now()),
          )
          .slice(0, 3)
          .map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    height: 300,
    overflow: "hidden",
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    backgroundColor: colors.surfaceHigh,
  },
  filterOverlay: { position: "absolute", top: spacing.sm, left: 0, right: 0 },
  bellWrap: { position: "absolute", right: spacing.md, bottom: spacing.md },
  filterChips: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md },
  chip: {
    backgroundColor: "rgba(15, 27, 45, 0.85)",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.subtext },
  chipTextActive: { color: colors.text, fontWeight: "600" },
  sheet: { flex: 1 },
  sheetContent: { padding: spacing.md, paddingBottom: spacing.xl },
  safetyCard: { marginBottom: spacing.lg, gap: spacing.sm },
  scheduledCard: { borderColor: colors.danger, borderWidth: 2 },
  scheduledLabel: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  scheduledTitle: { ...typography.heading, color: colors.text },
  ring: {
    alignSelf: "center",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 6,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.sm,
  },
  ringCaption: { ...typography.caption, color: colors.subtext },
  ringValue: { ...typography.title, fontSize: 26, color: colors.text, marginTop: 2 },
  safetyActions: { flexDirection: "row", gap: spacing.sm },
  safetyActionBtn: { flex: 1 },
  safetyTitle: { ...typography.heading, color: colors.text },
  safetyDesc: { ...typography.body, color: colors.subtext, lineHeight: 21 },
  sectionTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm + 4 },
});
