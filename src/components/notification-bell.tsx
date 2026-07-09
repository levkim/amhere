import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useUnreadCount } from "@/features/notifications/inbox";
import { colors, radius, shadow, typography } from "@/theme/tokens";

/** 알림함 진입 버튼 (안 읽은 개수 배지 포함) */
export function NotificationBell({ floating = false }: { floating?: boolean }) {
  const unread = useUnreadCount();

  return (
    <Pressable
      onPress={() => router.push("/notifications")}
      style={({ pressed }) => [
        styles.btn,
        floating && styles.floating,
        pressed && { opacity: 0.7 },
      ]}
      hitSlop={8}
    >
      <Text style={styles.icon}>🔔</Text>
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 6 },
  floating: {
    backgroundColor: "rgba(11, 17, 32, 0.85)",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  icon: { fontSize: 20 },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { ...typography.caption, fontSize: 10, color: colors.invert, fontWeight: "800" },
});
