import { useEffect } from "react";
import * as Location from "expo-location";
import { useLocationStore } from "@/stores/location";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";

const FOREGROUND_INTERVAL_MS = 10_000;

/**
 * 포그라운드 위치 추적. 앱이 켜져 있는 동안만 동작한다.
 * 백그라운드 추적은 안전 체크인 활성 시에만 별도 태스크로 켠다 (v1, ARCHITECTURE.md 참고).
 */
export function useCurrentLocation() {
  const setCoords = useLocationStore((s) => s.setCoords);
  const setPermissionDenied = useLocationStore((s) => s.setPermissionDenied);
  const session = useSessionStore((s) => s.session);

  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== "granted") {
        setPermissionDenied(true);
        return;
      }
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: FOREGROUND_INTERVAL_MS,
          distanceInterval: 25,
        },
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(coords);
          // 로그인 상태면 서버에도 위치 반영 (프라이버시 필터는 서버 RPC가 담당)
          if (supabase && session) {
            supabase
              .rpc("upsert_my_location", {
                lat: coords.lat,
                lng: coords.lng,
                acc: pos.coords.accuracy,
              })
              .then(({ error }) => {
                if (error) console.warn("upsert_my_location failed", error.message);
              });
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [session, setCoords, setPermissionDenied]);
}
