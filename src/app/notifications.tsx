import { useEffect } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useInbox, useMarkAllRead, type InboxItem } from "@/features/notifications/inbox";
import { colors, radius, spacing, typography } from "@/theme/tokens";

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}분 전`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.round(h / 24)}일 전`;
}

function Item({ item }: { item: InboxItem }) {
  const unread = item.readAt === null;
  return (
    <Card raised={false} style={[styles.item, unread && styles.itemUnread]}>
      <View style={styles.itemHeader}>
        <Text style={styles.title} numberOfLines={1}>
          {unread ? <Text style={styles.dot}>● </Text> : null}
          {item.title}
        </Text>
        <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
      </View>
      {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
    </Card>
  );
}

export default function Notifications() {
  const { data: items } = useInbox();
  const { mutate: markAllRead } = useMarkAllRead();

  // 화면을 열면 읽음 처리 (표시 중인 목록의 '안 읽음' 점은 이번 방문 동안 유지됨)
  useEffect(() => {
    if (items && items.some((n) => n.readAt === null)) markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items?.length]);

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <Item item={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            emoji="🔔"
            title="아직 알림이 없어요"
            description="버디 요청, 참가신청, 안전 알림이 오면 여기에 쌓여요."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1, gap: spacing.sm },
  item: { padding: spacing.md, borderRadius: radius.md },
  itemUnread: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  title: { ...typography.body, fontWeight: "700", color: colors.text, flex: 1 },
  dot: { color: colors.accent },
  time: { ...typography.caption, color: colors.subtext },
  body: { ...typography.body, color: colors.subtext, marginTop: 4, lineHeight: 20 },
});
