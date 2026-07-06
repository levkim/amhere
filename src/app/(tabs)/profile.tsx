import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { isDemoMode } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";
import { colors, spacing, typography } from "@/theme/tokens";

export default function Profile() {
  const session = useSessionStore((s) => s.session);
  const signOut = useSessionStore((s) => s.signOut);

  const displayName = isDemoMode
    ? "데모 사용자"
    : (session?.user.phone ?? "알 수 없음");

  return (
    <Screen>
      <Card style={styles.card}>
        <Text style={styles.avatar}>⛷️</Text>
        <Text style={styles.name}>{displayName}</Text>
        <View style={styles.badges}>
          <Tag label="Lv.1 새내기" tone="accent" />
          {isDemoMode ? <Tag label="데모 모드" /> : null}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>위치 공개 설정</Text>
        <Text style={styles.desc}>
          현재: <Text style={styles.strong}>대략 (500m)</Text>
          {"\n"}정확한 위치는 매칭이 성사된 버디에게만 공개돼요. 고스트 모드를 켜면 지도에서
          완전히 사라집니다.
        </Text>
      </Card>

      <View style={styles.footer}>
        <Button label="로그아웃" variant="secondary" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md, gap: spacing.sm },
  avatar: { fontSize: 48 },
  name: { ...typography.title, color: colors.text },
  badges: { flexDirection: "row", gap: spacing.xs + 2 },
  sectionTitle: { ...typography.heading, color: colors.text },
  desc: { ...typography.body, color: colors.subtext, lineHeight: 21 },
  strong: { color: colors.text, fontWeight: "600" },
  footer: { flex: 1, justifyContent: "flex-end", paddingBottom: spacing.xl },
});
