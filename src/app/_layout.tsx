import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { usePushRegistration } from "@/features/notifications/use-push-registration";
import { useSafetyStore } from "@/features/safety/hooks";
import { useIsSignedIn, useSessionStore } from "@/stores/session";
import { colors } from "@/theme/tokens";

export default function RootLayout() {
  const init = useSessionStore((s) => s.init);
  const initialized = useSessionStore((s) => s.initialized);
  const session = useSessionStore((s) => s.session);
  const signedIn = useIsSignedIn();
  const hydrateSafety = useSafetyStore((s) => s.hydrate);

  useEffect(() => {
    init();
  }, [init]);

  usePushRegistration(); // 로그인 시 이 기기를 알림 수신 대상으로 등록

  // 로그인되면 진행/예약 중인 체크인을 DB에서 복원 (앱 재시작해도 배너 유지)
  useEffect(() => {
    if (session) hydrateSafety();
  }, [session, hydrateSafety]);

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
          <Stack.Screen name="user/[id]" options={{ title: "프로필" }} />
          <Stack.Screen
            name="profile/edit"
            options={{ title: "프로필 편집", presentation: "modal" }}
          />
          <Stack.Screen name="profile/history" options={{ title: "내 활동 기록" }} />
          <Stack.Screen
            name="safety/check-in"
            options={{ title: "안전 체크인", presentation: "modal" }}
          />
          <Stack.Screen name="safety/contacts" options={{ title: "비상연락처" }} />
          <Stack.Screen
            name="safety/pick-location"
            options={{ title: "위치 추가", presentation: "modal" }}
          />
          <Stack.Screen
            name="safety/report"
            options={{ title: "신고/차단", presentation: "modal" }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}
