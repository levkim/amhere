import { Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const TRACK_TASK = "amhere-track-task";
const STORAGE_KEY = "amhere-track-points";

export type TrackPoint = { lat: number; lng: number; t: number };

/** 저장된 경로 포인트 읽기 */
export async function loadTrack(): Promise<TrackPoint[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as TrackPoint[]) : [];
}

async function appendPoints(points: TrackPoint[]) {
  const existing = await loadTrack();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, ...points]));
}

export async function clearTrack() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

// 백그라운드 위치 태스크 — 화면이 꺼져도 OS가 좌표를 넘겨준다
TaskManager.defineTask(TRACK_TASK, async ({ data, error }: any) => {
  if (error || !data) return;
  const locs: Location.LocationObject[] = data.locations ?? [];
  if (locs.length === 0) return;
  await appendPoints(
    locs.map((l) => ({ lat: l.coords.latitude, lng: l.coords.longitude, t: l.timestamp })),
  );
});

/** 경로 기록 시작 (백그라운드) */
export async function startTracking(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  // 백그라운드 거부돼도 포그라운드로는 기록됨 (앱 열려 있을 때)

  await clearTrack();

  const already = await Location.hasStartedLocationUpdatesAsync(TRACK_TASK).catch(() => false);
  if (already) await Location.stopLocationUpdatesAsync(TRACK_TASK).catch(() => {});

  await Location.startLocationUpdatesAsync(TRACK_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 15, // 15m마다 (배터리 관리)
    deferredUpdatesInterval: 10_000,
    foregroundService:
      Platform.OS === "android"
        ? {
            notificationTitle: "여기있어 · 경로 기록 중",
            notificationBody: "활동 경로를 기록하고 있어요. 체크아웃하면 멈춰요.",
            notificationColor: "#2DD4A7",
          }
        : undefined,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
  return bg.status === "granted";
}

/** 경로 기록 종료 → 누적 포인트 반환 */
export async function stopTracking(): Promise<TrackPoint[]> {
  const running = await Location.hasStartedLocationUpdatesAsync(TRACK_TASK).catch(() => false);
  if (running) await Location.stopLocationUpdatesAsync(TRACK_TASK).catch(() => {});
  const points = await loadTrack();
  return points;
}

/** 하버사인 누적 거리(m) */
export function trackDistance(points: TrackPoint[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const R = 6371000;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    d += 2 * R * Math.asin(Math.sqrt(s));
  }
  return d;
}
