// Mapbox Geocoding API로 장소 검색 (인스타그램식 위치 선택)
// 이미 있는 EXPO_PUBLIC_MAPBOX_TOKEN을 재사용한다 (ADR 0004).

export type Place = {
  id: string;
  name: string; // 짧은 이름 (예: 용평리조트)
  address: string; // 전체 주소 (예: 강원특별자치도 평창군 ...)
  lat: number;
  lng: number;
};

/**
 * 장소 검색. near가 주어지면 그 주변 결과를 우선한다.
 * 토큰이 없거나 검색어가 비면 빈 배열을 반환한다 (자유 입력으로 폴백).
 */
export async function searchPlaces(
  query: string,
  near?: { lat: number; lng: number },
): Promise<Place[]> {
  const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  const q = query.trim();
  if (!token || q.length === 0) return [];

  const proximity = near ? `&proximity=${near.lng},${near.lat}` : "";
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${token}&language=ko&limit=8&types=poi,place,locality,neighborhood,address${proximity}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("장소 검색에 실패했어요.");

  const data = await res.json();
  return (data.features ?? []).map((f: any) => ({
    id: f.id,
    name: f.text ?? f.place_name,
    address: f.place_name ?? "",
    lng: f.center?.[0] ?? near?.lng ?? 0,
    lat: f.center?.[1] ?? near?.lat ?? 0,
  }));
}
