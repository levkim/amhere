import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { searchPlaces, type Place } from "@/features/places/search";
import { usePlacePicker } from "@/features/places/store";
import { useEffectiveCoords } from "@/stores/location";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export default function PickLocation() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const coords = useEffectiveCoords();
  const setPicked = usePlacePicker((s) => s.setPicked);

  // 검색어 입력 → 300ms 디바운스 후 검색
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      setError(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        setResults(await searchPlaces(query, coords));
        setError(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, coords]);

  const choose = (place: Place) => {
    setPicked(place);
    router.back();
  };

  // 현재 위치를 장소로 (역지오코딩으로 동 이름 등)
  const useCurrentLocation = async () => {
    try {
      const [addr] = await Location.reverseGeocodeAsync({
        latitude: coords.lat,
        longitude: coords.lng,
      });
      const name =
        [addr?.district, addr?.street, addr?.name].filter(Boolean).join(" ") || "현재 위치";
      choose({ id: "current", name, address: name, lat: coords.lat, lng: coords.lng });
    } catch {
      choose({ id: "current", name: "현재 위치", address: "", lat: coords.lat, lng: coords.lng });
    }
  };

  const useFreeText = () => {
    const name = query.trim();
    if (!name) return;
    choose({ id: "custom", name, address: name, lat: coords.lat, lng: coords.lng });
  };

  return (
    <Screen padded={false}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="장소 검색 (예: 용평리조트, 발왕산)"
          placeholderTextColor={colors.subtext}
          autoFocus
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => choose(item)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.pin}>📍</Text>
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.name}</Text>
              {item.address && item.address !== item.name ? (
                <Text style={styles.address} numberOfLines={1}>
                  {item.address}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )}
        ListHeaderComponent={
          <Pressable
            onPress={useCurrentLocation}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.pin}>🎯</Text>
            <Text style={styles.currentText}>현재 위치 사용</Text>
          </Pressable>
        }
        ListFooterComponent={
          <View>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={styles.loading} />
            ) : null}
            {error ? (
              <Text style={styles.hint}>검색에 실패했어요. 네트워크를 확인해 주세요.</Text>
            ) : null}
            {query.trim().length > 0 && !loading ? (
              <Pressable
                onPress={useFreeText}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Text style={styles.pin}>✏️</Text>
                <Text style={styles.currentText}>
                  &ldquo;{query.trim()}&rdquo; 직접 입력
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBar: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  input: {
    ...typography.body,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  list: { paddingBottom: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.surface },
  pin: { fontSize: 18 },
  rowText: { flex: 1 },
  name: { ...typography.body, color: colors.text },
  address: { ...typography.caption, color: colors.subtext, marginTop: 2 },
  currentText: { ...typography.body, color: colors.primary, fontWeight: "600" },
  loading: { marginTop: spacing.lg },
  hint: {
    ...typography.caption,
    color: colors.subtext,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
