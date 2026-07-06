import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { useIsSignedIn, useSessionStore } from "@/stores/session";
import { colors } from "@/theme/tokens";

export default function RootLayout() {
  const init = useSessionStore((s) => s.init);
  const initialized = useSessionStore((s) => s.initialized);
  const signedIn = useIsSignedIn();

  useEffect(() => {
    init();
  }, [init]);

  if (!initialized) return null; // 스플래시 유지

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="post/[id]" options={{ title: "포스트" }} />
          <Stack.Screen
            name="post/new"
            options={{ title: "새 포스트", presentation: "modal" }}
          />
          <Stack.Screen name="buddy/find" options={{ title: "버디 찾기" }} />
          <Stack.Screen
            name="buddy/new"
            options={{ title: "버디 요청", presentation: "modal" }}
          />
          <Stack.Screen name="chat/[requestId]" options={{ title: "채팅" }} />
          <Stack.Screen
            name="safety/check-in"
            options={{ title: "안전 체크인", presentation: "modal" }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}
