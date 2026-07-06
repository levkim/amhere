import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { isDemoMode } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";
import { colors, spacing, typography } from "@/theme/tokens";

export default function Welcome() {
  const enterDemo = useSessionStore((s) => s.enterDemo);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.logo}>🏔️</Text>
        <Text style={styles.title}>여기있어</Text>
        <Text style={styles.subtitle}>
          지금, 여기, 나와 같은 아웃도어 사람들.{"\n"}혼자여도 혼자가 아니게.
        </Text>
      </View>

      <View style={styles.actions}>
        {isDemoMode ? (
          <>
            <Button label="데모로 둘러보기" onPress={enterDemo} />
            <Text style={styles.hint}>
              Supabase 연결 전이라 데모 모드로 실행돼요.{"\n"}.env에
              EXPO_PUBLIC_SUPABASE_URL을 설정하면 로그인이 활성화됩니다.
            </Text>
          </>
        ) : (
          <>
            <Button label="전화번호로 시작하기" onPress={() => router.push("/sign-in")} />
            <Text style={styles.hint}>가입하면 이용약관과 위치정보 이용에 동의하게 됩니다.</Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { fontSize: 64, marginBottom: spacing.md },
  title: { ...typography.title, fontSize: 36, color: colors.text },
  subtitle: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 24,
  },
  actions: { paddingBottom: spacing.xl, gap: spacing.md },
  hint: { ...typography.caption, color: colors.subtext, textAlign: "center", lineHeight: 18 },
});
