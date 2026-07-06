import { create } from "zustand";

export type Coords = { lat: number; lng: number };

/** 데모/권한 거부 시 폴백 좌표: 용평리조트 */
export const FALLBACK_COORDS: Coords = { lat: 37.643, lng: 128.68 };

type LocationState = {
  coords: Coords | null;
  permissionDenied: boolean;
  setCoords: (c: Coords) => void;
  setPermissionDenied: (v: boolean) => void;
};

export const useLocationStore = create<LocationState>((set) => ({
  coords: null,
  permissionDenied: false,
  setCoords: (coords) => set({ coords }),
  setPermissionDenied: (permissionDenied) => set({ permissionDenied }),
}));

/** 화면에서 쓰는 유효 좌표 (실좌표 → 폴백 순) */
export const useEffectiveCoords = (): Coords =>
  useLocationStore((s) => s.coords) ?? FALLBACK_COORDS;
