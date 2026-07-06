import { Stack } from "expo-router";
import { colors } from "@/theme/tokens";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ title: "로그인" }} />
      <Stack.Screen name="verify" options={{ title: "인증번호 확인" }} />
    </Stack>
  );
}
