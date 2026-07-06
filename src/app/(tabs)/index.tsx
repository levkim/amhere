import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post-card";
import { LiveMap } from "@/components/map/live-map";
import { useNearbyPosts } from "@/features/feed/hooks";
import { useNearbyUsers } from "@/features/matching/hooks";
import { useCurrentLocation } from "@/features/location/use-current-location";
import { useSafetyStore } from "@/features/safety/hooks";
import { useEffectiveCoords } from "@/stores/location";
import { ACTIVITY_LABELS, colors, radius, spacing, typography } from "@/theme/tokens";

// 라이브 맵 (홈) — Mapbox 지도 위에 내 위치·주변 포스트·주변 사용자를 표시한다.
// 웹에서는 live-map.web.tsx의 안내 화면으로 대체된다 (Metro가 자동 선택).
export default function MapHome() {
  useCurrentLocation();

  const coords = useEffectiveCoords();
  const { data: posts } = useNearbyPosts();
  const { data: users } = useNearbyUsers();
  const activeCheckIn = useSafetyStore((s) => s.active);

  return (
    <Screen padded={false}>
      <View style={styles.mapWrap}>
        <LiveMap center={coords} posts={posts ?? []} users={users ?? []} />
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
        {/* 안전 체크인 배너 */}
        <Card style={styles.safetyCard}>
          {activeCheckIn ? (
            <>
              <Text style={styles.safetyTitle}>
                🟢 {ACTIVITY_LABELS[activeCheckIn.activity]} 활동 중
              </Text>
              <Text style={styles.safetyDesc}>
                {new Date(activeCheckIn.expectedEndAt).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                까지 체크아웃하지 않으면 알림이 발송돼요.
              </Text>
              <Button
                label="활동 종료 (체크아웃)"
                variant="secondary"
                onPress={() => useSafetyStore.getState().complete()}
              />
            </>
          ) : (
            <>
              <Text style={styles.safetyTitle}>🛡️ 혼자 나가시나요?</Text>
              <Text style={styles.safetyDesc}>
                안전 체크인을 켜면 제시간에 돌아오지 않을 때 자동으로 알림을 보내드려요.
              </Text>
              <Button label="안전 체크인 시작" onPress={() => router.push("/safety/check-in")} />
            </>
          )}
        </Card>

        {/* 주변 소식 미리보기 */}
        <Text style={styles.sectionTitle}>지금 주변에서</Text>
        {(posts ?? []).slice(0, 3).map((post) => (
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
  sheet: { flex: 1 },
  sheetContent: { padding: spacing.md, paddingBottom: spacing.xl },
  safetyCard: { marginBottom: spacing.lg, gap: spacing.sm },
  safetyTitle: { ...typography.heading, color: colors.text },
  safetyDesc: { ...typography.body, color: colors.subtext, lineHeight: 21 },
  sectionTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm + 4 },
});
