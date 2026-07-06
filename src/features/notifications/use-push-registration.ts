import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";

// EAS 프로젝트 ID (app.config.js extra.eas.projectId와 동일)
const EAS_PROJECT_ID = "97893b21-532e-4079-b936-16e4755369b1";

// 앱이 켜져 있을 때도 알림 배너를 보여준다
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * 로그인하면 이 기기의 푸시 토큰을 서버(device_tokens)에 등록한다.
 * 웹/데모 모드에서는 아무것도 하지 않는다.
 */
export function usePushRegistration() {
  const session = useSessionStore((s) => s.session);

  useEffect(() => {
    if (!supabase || !session || Platform.OS === "web") return;

    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") return; // 사용자가 거부하면 조용히 통과

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "기본 알림",
            importance: Notifications.AndroidImportance.HIGH,
            sound: "default",
          });
        }

        const token = (
          await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID })
        ).data;

        await supabase.from("device_tokens").upsert({
          user_id: session.user.id,
          expo_push_token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        // Expo Go 등 미지원 환경에서는 실패할 수 있다 — 앱 동작에는 영향 없음
        console.warn("push registration skipped:", e);
      }
    })();
  }, [session]);
}
