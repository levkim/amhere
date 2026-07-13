import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { LiveActivityMap } from "@/components/map/live-activity-map";
import {
  LIVEMAP_MSG,
  useLiveLocations,
  useMyLiveShare,
  type LiveMember,
} from "@/features/activity/live";
import { useSendActivityMessage } from "@/features/activity/hooks";
import { useMyUserId } from "@/features/matching/hooks";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

function agoLabel(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  return `${Math.round(mins / 60)}시간 전`;
}

function trailDistanceM(trail: LiveMember["trail"]): number {
  let d = 0;
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1];
    const b = trail[i];
    const R = 6371000;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    d += 2 * R * Math.asin(Math.sqrt(s));
  }
  return d;
}

export default function ActivityLiveMap() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const checkInId = id ?? "";
  const myId = useMyUserId();
  const { data: members } = useLiveLocations(checkInId);
  const { sharing, busy, toggle } = useMyLiveShare(checkInId);
  const { mutateAsync: sendMessage, isPending: sendingMsg } = useSendActivityMessage(checkInId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = members?.find((m) => m.userId === selectedId) ?? null;

  const onToggleShare = async () => {
    const result = await toggle();
    if (result === "denied") {
      Alert.alert("위치 권한 필요", "설정에서 위치 권한을 허용해야 위치를 공유할 수 있어요.");
    }
  };

  const shareToChat = async () => {
    try {
      await sendMessage(LIVEMAP_MSG);
      Alert.alert("공유 완료", "단체 채팅에 라이브 맵을 공유했어요.", [
        { text: "채팅 보기", onPress: () => router.push(`/activity/${checkInId}/chat`) },
        { text: "확인" },
      ]);
    } catch (e) {
      Alert.alert("공유 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    }
  };

  return (
    <Screen padded={false} edges={[]}>
      <LiveActivityMap
        members={members ?? []}
        selectedId={selectedId}
        onSelect={(uid) => setSelectedId(uid === selectedId ? null : uid)}
      />

      {/* 상단: 공유 중 인원 안내 */}
      <View style={styles.topBar} pointerEvents="none">
        <Text style={styles.topText}>
          📡 {members?.length ?? 0}명 위치 공유 중
          {members && members.length === 0 ? " — 아직 아무도 공유하지 않았어요" : ""}
        </Text>
      </View>

      {/* 선택된 멤버 상세 카드 */}
      {selected ? (
        <View style={styles.detailCard}>
          <View style={styles.detailHead}>
            <Text style={styles.detailName}>
              {selected.nickname}
              {selected.userId === myId ? " (나)" : ""}
            </Text>
            <Text style={styles.detailAgo}>{agoLabel(selected.updatedAt)} 갱신</Text>
          </View>
          <Text style={styles.detailCoords}>
            📍 {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
          </Text>
          <Text style={styles.detailMeta}>
            꼬리 {selected.trail.length}개 포인트 ·{" "}
            {(() => {
              const d = trailDistanceM(selected.trail);
              return d >= 1000 ? `${(d / 1000).toFixed(2)}km` : `${Math.round(d)}m`;
            })()}{" "}
            이동
          </Text>
        </View>
      ) : null}

      {/* 하단: 멤버 칩 + 액션 */}
      <View style={styles.bottom}>
        {members && members.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              {members.map((m) => (
                <Pressable
                  key={m.userId}
                  onPress={() => setSelectedId(m.userId === selectedId ? null : m.userId)}
                  style={[styles.chip, m.userId === selectedId && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, m.userId === selectedId && styles.chipTextActive]}
                    numberOfLines={1}
                  >
                    {m.nickname}
                    {m.userId === myId ? " (나)" : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={onToggleShare}
            disabled={busy}
            style={[styles.actionBtn, sharing ? styles.actionOn : styles.actionOff]}
          >
            <Text style={styles.actionText}>
              {busy ? "..." : sharing ? "📡 내 위치 공유 중 — 끄기" : "📡 내 위치 공유 켜기"}
            </Text>
          </Pressable>
          <Pressable
            onPress={shareToChat}
            disabled={sendingMsg}
            style={[styles.actionBtn, styles.actionShare]}
          >
            <Text style={styles.actionText}>💬 채팅에 공유</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 54,
    alignSelf: "center",
    backgroundColor: "rgba(11, 17, 32, 0.85)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topText: { ...typography.caption, color: colors.text, fontWeight: "700" },
  detailCard: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: 148,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
    ...shadow.card,
  },
  detailHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailName: { ...typography.heading, fontSize: 16, color: colors.text },
  detailAgo: { ...typography.caption, color: colors.accent, fontWeight: "700" },
  detailCoords: { ...typography.body, color: colors.text },
  detailMeta: { ...typography.caption, color: colors.subtext },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg + 8,
    gap: spacing.sm,
  },
  chips: { flexDirection: "row", gap: spacing.sm },
  chip: {
    backgroundColor: "rgba(11, 17, 32, 0.85)",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    maxWidth: 140,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.text, fontWeight: "600" },
  chipTextActive: { color: colors.invert, fontWeight: "800" },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md - 2,
    alignItems: "center",
    ...shadow.card,
  },
  actionOn: { backgroundColor: colors.accent },
  actionOff: { backgroundColor: colors.surfaceHigher },
  actionShare: { backgroundColor: colors.primary },
  actionText: { ...typography.body, fontWeight: "800", color: "#fff" },
});
