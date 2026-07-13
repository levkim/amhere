// 라이브 위치 공유 엔진 — 진행 중인 활동의 멤버가 자기 위치를 서버에 주기 업서트한다.
// 호스트는 경로 기록(TRACK_TASK) 콜백에 편승하고, 동행은 전용 LIVE_TASK를 돌린다.
import { Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

export const LIVE_TASK = "amhere-live-task";
const SESSION_KEY = "amhere-live-session"; // { checkInId }
const TRAIL_MAX = 60; // 서버에 보관할 경로 꼬리 최대 포인트

export type LiveSession = { checkInId: string };

export async function getLiveSession(): Promise<LiveSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as LiveSession) : null;
}

/** 위치 배치를 서버에 업서트 — 라이브 세션이 없으면 무시 (TRACK_TASK에서도 호출됨) */
export async function pushLive(
  points: { lat: number; lng: number; t: number }[],
): Promise<void> {
  if (!supabase || points.length === 0) return;
  const session = await getLiveSession();
  if (!session) return;

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;

  const last = points[points.length - 1];

  // 기존 꼬리에 이어붙이고 최대 길이로 자름
  const { data: existing } = await supabase
    .from("live_locations")
    .select("trail")
    .eq("check_in_id", session.checkInId)
    .eq("user_id", user.id)
    .maybeSingle();
  const trail = [...(Array.isArray(existing?.trail) ? existing.trail : []), ...points].slice(
    -TRAIL_MAX,
  );

  await supabase.from("live_locations").upsert({
    check_in_id: session.checkInId,
    user_id: user.id,
    lat: last.lat,
    lng: last.lng,
    trail,
    updated_at: new Date().toISOString(),
  });
}

// 동행용 백그라운드 태스크 — 라이브 공유만 하고 로컬 트랙은 기록하지 않는다
TaskManager.defineTask(LIVE_TASK, async ({ data, error }: any) => {
  if (error || !data) return;
  const locs: Location.LocationObject[] = data.locations ?? [];
  if (locs.length === 0) return;
  await pushLive(
    locs.map((l) => ({ lat: l.coords.latitude, lng: l.coords.longitude, t: l.timestamp })),
  ).catch(() => {});
});

/** 라이브 세션만 설정 (호스트용 — TRACK_TASK가 이미 돌고 있어 편승) */
export async function setLiveSession(checkInId: string): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ checkInId }));
}

/** 라이브 공유 시작 (동행용 — 전용 LIVE_TASK 구동) */
export async function startLiveShare(checkInId: string): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return false;
  await Location.requestBackgroundPermissionsAsync().catch(() => {});
  // 백그라운드 거부여도 앱이 열려 있는 동안은 공유됨

  await setLiveSession(checkInId);

  const running = await Location.hasStartedLocationUpdatesAsync(LIVE_TASK).catch(() => false);
  if (running) await Location.stopLocationUpdatesAsync(LIVE_TASK).catch(() => {});

  await Location.startLocationUpdatesAsync(LIVE_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 30, // 30m마다 (라이브 공유는 트래킹보다 성기게 — 배터리)
    deferredUpdatesInterval: 20_000,
    foregroundService:
      Platform.OS === "android"
        ? {
            notificationTitle: "여기이써 · 위치 공유 중",
            notificationBody: "활동 동행에게 내 위치를 공유하고 있어요.",
            notificationColor: "#2DD4A7",
          }
        : undefined,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });

  // 시작 즉시 현재 위치 한 번 올려 지도에 바로 보이게
  const cur = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  }).catch(() => null);
  if (cur) {
    await pushLive([
      { lat: cur.coords.latitude, lng: cur.coords.longitude, t: cur.timestamp },
    ]).catch(() => {});
  }
  return true;
}

/** 라이브 공유 중단 — 태스크 정지 + 세션 제거 + 내 서버 행 삭제 */
export async function stopLiveShare(checkInId?: string): Promise<void> {
  const session = await getLiveSession();
  const cid = checkInId ?? session?.checkInId;

  const running = await Location.hasStartedLocationUpdatesAsync(LIVE_TASK).catch(() => false);
  if (running) await Location.stopLocationUpdatesAsync(LIVE_TASK).catch(() => {});
  await AsyncStorage.removeItem(SESSION_KEY);

  if (supabase && cid) {
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      await supabase
        .from("live_locations")
        .delete()
        .eq("check_in_id", cid)
        .eq("user_id", user.id);
    }
  }
}

/** 지금 이 활동을 공유 중인지 */
export async function isSharing(checkInId: string): Promise<boolean> {
  const session = await getLiveSession();
  return session?.checkInId === checkInId;
}
