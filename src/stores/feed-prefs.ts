import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 피드 노출 반경 옵션. value=null → 무제한 (거리 제한 없음, 가까운·최신 우선 정렬)
export const RADIUS_OPTIONS: { label: string; value: number | null }[] = [
  { label: "무제한", value: null },
  { label: "100km", value: 100_000 },
  { label: "50km", value: 50_000 },
  { label: "30km", value: 30_000 },
  { label: "10km", value: 10_000 },
];

// 무제한일 때 서버에 넘기는 실질 반경(지구 반 바퀴 — 전 지구 포함)
export const UNLIMITED_RADIUS_M = 20_000_000;

type FeedPrefs = {
  radiusM: number | null; // null = 무제한 (기본값)
  setRadiusM: (r: number | null) => void;
};

export const useFeedPrefs = create<FeedPrefs>()(
  persist(
    (set) => ({
      radiusM: null, // 처음엔 무제한
      setRadiusM: (radiusM) => set({ radiusM }),
    }),
    { name: "amhere-feed-prefs", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
