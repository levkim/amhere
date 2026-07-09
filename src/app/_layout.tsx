import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { usePushRegistration } from "@/features/notifications/use-push-registration";
import { useSafetyStore } from "@/features/safety/hooks";
import { useMyProfile } from "@/features/profile/hooks";
import { ErrorBoundary } from "@/components/error-boundary";
import { isDemoMode } from "@/lib/supabase";
import { useIsSignedIn, useSessionStore } from "@/stores/session";
import { colors } from "@/theme/tokens";

// 프로바이더 안쪽에서 프로필을 읽어 온보딩 여부를 판단한다.
function RootNav() {
  const session = useSessionStore((s) => s.session);
  const signedIn = useIsSignedIn();
  const hydrateSafety = useSafetyStore((s) => s.hydrate);
  const { data: profile } = useMyProfile();

  usePushRegistration();

  useEffect(() => {
    if (session) hydrateSafety();
  }, [session, hydrateSafety]);

  // 데모는 온보딩 없음. 로그인했는데 아직 온보딩 안 했으면 온보딩으로.
  const needsOnboarding = signedIn && !isDemoMode && profile ? !profile.onboarded : false;
  const inApp = signedIn && !needsOnboarding;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Protected guard={needsOnboarding}>
          <Stack.Screen name="(onboarding)/setup" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={inApp}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="post/[id]" options={{ title: "포스트" }} />
          <Stack.Screen name="post/new" options={{ title: "새 포스트", presentation: "modal" }} />
          <Stack.Screen name="buddy/find" options={{ title: "버디 찾기" }} />
          <Stack.Screen name="buddy/new" options={{ title: "버디 요청", presentation: "modal" }} />
          <Stack.Screen name="chat/[requestId]" options={{ title: "채팅" }} />
          <Stack.Screen name="activity/[id]/participants" options={{ title: "참가신청 관리" }} />
          <Stack.Screen name="activity/[id]/chat" options={{ title: "단체 채팅" }} />
          <Stack.Screen name="user/[id]" options={{ title: "프로필" }} />
          <Stack.Screen
            name="profile/edit"
            options={{ title: "프로필 편집", presentation: "modal" }}
          />
          <Stack.Screen name="profile/history" options={{ title: "내 활동 기록" }} />
          <Stack.Screen name="profile/my-posts" options={{ title: "내 포스트" }} />
          <Stack.Screen name="notifications" options={{ title: "알림" }} />
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
    </>
  );
}

export default function RootLayout() {
  const init = useSessionStore((s) => s.init);
  const initialized = useSessionStore((s) => s.initialized);

  useEffect(() => {
    init();
  }, [init]);

  if (!initialized) return null; // 스플래시 유지

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RootNav />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
