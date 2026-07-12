import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { isDemoMode } from "@/lib/supabase";
import { googleSignInAvailable, signInWithGoogle } from "@/features/auth/google";
import { useSessionStore } from "@/stores/session";
import { colors, spacing, typography } from "@/theme/tokens";

export default function Welcome() {
  const enterDemo = useSessionStore((s) => s.enterDemo);
  const [googleLoading, setGoogleLoading] = useState(false);

  const doGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // 세션이 생기면 _layout 가드가 자동으로 온보딩/홈으로 전환한다
    } catch (e) {
      Alert.alert("Google 로그인 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.logo}>🏔️</Text>
        <Text style={styles.title}>여기이써</Text>
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
            <Button label="📱 전화번호로 시작하기" onPress={() => router.push("/sign-in")} />
            {googleSignInAvailable ? (
              <Button
                label="Google로 계속하기"
                variant="secondary"
                onPress={doGoogle}
                loading={googleLoading}
              />
            ) : null}
            <Text style={styles.hint}>
              가입 시 다음 단계에서 이용약관·개인정보·위치정보 동의를 받아요.
            </Text>
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
