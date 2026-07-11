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
import { initSentry, wrapWithSentry } from "@/lib/sentry";
// 백그라운드 위치 태스크(TaskManager.defineTask)를 앱 시작 시 등록한다.
// OS가 백그라운드 이벤트를 전달하려면 이 모듈이 최상위에서 import되어 있어야 한다.
import "@/features/tracking/engine";

initSentry();

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
          <Stack.Screen name="activity/[id]/record" options={{ title: "활동 기록" }} />
          <Stack.Screen name="activity/[id]/participants" options={{ title: "참가신청 관리" }} />
          <Stack.Screen name="activity/[id]/chat" options={{ title: "단체 채팅" }} />
          <Stack.Screen name="crew/new" options={{ title: "크루 만들기", presentation: "modal" }} />
          <Stack.Screen name="crew/[id]/index" options={{ title: "크루" }} />
          <Stack.Screen name="crew/[id]/chat" options={{ title: "크루 채팅" }} />
          <Stack.Screen name="user/[id]" options={{ title: "프로필" }} />
          <Stack.Screen
            name="profile/edit"
            options={{ title: "프로필 편집", presentation: "modal" }}
          />
          <Stack.Screen name="profile/history" options={{ title: "내 활동 기록" }} />
          <Stack.Screen name="profile/my-posts" options={{ title: "내 포스트" }} />
          <Stack.Screen name="profile/archive" options={{ title: "보관함" }} />
          <Stack.Screen name="post/view/[id]" options={{ title: "기록" }} />
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
        {/* 약관 문서 — 로그인 전(가입 동의 화면)에서도 열 수 있어야 하므로 가드 밖 */}
        <Stack.Screen name="legal/terms" options={{ title: "이용약관", presentation: "modal" }} />
        <Stack.Screen
          name="legal/privacy"
          options={{ title: "개인정보 처리방침", presentation: "modal" }}
        />
        <Stack.Screen
          name="legal/location-terms"
          options={{ title: "위치기반서비스 이용약관", presentation: "modal" }}
        />
      </Stack>
    </>
  );
}

function RootLayout() {
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

// Sentry로 감싸 렌더·라우팅 오류를 자동 캡처 (DSN 없으면 그대로 통과)
export default wrapWithSentry(RootLayout);
