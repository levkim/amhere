import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { useCreatePost } from "@/features/feed/hooks";
import { tagsForActivity } from "@/features/feed/post-tags";
import type { PostVisibility } from "@/features/feed/types";
import { useMyJoinedCrews } from "@/features/crew/hooks";
import { usePlacePicker } from "@/features/places/store";
import { useEffectiveCoords, type Coords } from "@/stores/location";
import { ACTIVITY_LABELS, colors, radius, spacing, typography, type Activity } from "@/theme/tokens";

const MAX_LEN = 200;

const VISIBILITY_OPTIONS: { key: PostVisibility; label: string; desc: string }[] = [
  { key: "public", label: "🌐 전체 공개", desc: "주변 모두에게 보여요" },
  { key: "friends", label: "🤝 친구에게만", desc: "수락된 버디에게만 보여요" },
];

export default function NewPost() {
  const [body, setBody] = useState("");
  const [activity, setActivity] = useState<Activity>("ski");
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [placeCoords, setPlaceCoords] = useState<Coords | null>(null);
  const [crewId, setCrewId] = useState<string | null>(null);
  const coords = useEffectiveCoords();
  const { mutateAsync, isPending } = useCreatePost();
  const { data: myCrews } = useMyJoinedCrews();

  // 위치 추가 화면에서 고른 장소 반영 (핀 좌표도 그 장소로)
  const pickedPlace = usePlacePicker((s) => s.picked);
  const setPickedPlace = usePlacePicker((s) => s.setPicked);
  useEffect(() => {
    if (pickedPlace) {
      setPlaceName(pickedPlace.name);
      setPlaceCoords({ lat: pickedPlace.lat, lng: pickedPlace.lng });
      setPickedPlace(null);
    }
  }, [pickedPlace, setPickedPlace]);

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const submit = async () => {
    try {
      const pin = placeCoords ?? coords;
      await mutateAsync({
        body: body.trim(),
        tags,
        activity,
        lat: pin.lat,
        lng: pin.lng,
        imageUri,
        visibility,
        placeName,
        crewId,
      });
      router.back();
    } catch (e) {
      Alert.alert("작성 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    }
  };

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>지금 여기, 무슨 일이 있나요?</Text>
        <TextInput
          style={styles.input}
          value={body}
          onChangeText={setBody}
          placeholder="예) 레인보우 상단 설질 최고. 오전에 꼭 타세요"
          placeholderTextColor={colors.subtext}
          multiline
          maxLength={MAX_LEN}
          autoFocus
        />
        <Text style={styles.counter}>
          {body.length}/{MAX_LEN} · 현재 위치에 남고 48시간 후 피드에서 내려가요 (내 글은 보관돼요)
        </Text>

        <Text style={styles.label}>위치 추가 (선택)</Text>
        <Pressable
          onPress={() => router.push("/safety/pick-location")}
          style={({ pressed }) => [styles.locationRow, pressed && styles.locationRowPressed]}
        >
          <Text style={styles.locationPin}>📍</Text>
          {placeName ? (
            <Text style={styles.locationValue}>{placeName}</Text>
          ) : (
            <Text style={styles.locationPlaceholder}>장소 검색 · 미지정 시 현재 위치</Text>
          )}
          {placeName ? (
            <Pressable
              onPress={() => {
                setPlaceName(null);
                setPlaceCoords(null);
              }}
              hitSlop={10}
            >
              <Text style={styles.locationClear}>✕</Text>
            </Pressable>
          ) : (
            <Text style={styles.locationChevron}>›</Text>
          )}
        </Pressable>

        <Text style={styles.label}>활동</Text>
        <View style={styles.chips}>
          {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setActivity(key)}
              style={[styles.chip, activity === key && styles.chipActive]}
            >
              <Text style={[styles.chipText, activity === key && styles.chipTextActive]}>
                {ACTIVITY_LABELS[key]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>태그</Text>
        <View style={styles.chips}>
          {tagsForActivity(activity, tags).map((tag) => (
            <Pressable
              key={tag}
              onPress={() => toggleTag(tag)}
              style={[styles.chip, tags.includes(tag) && styles.chipActive]}
            >
              <Text style={[styles.chipText, tags.includes(tag) && styles.chipTextActive]}>
                #{tag}
              </Text>
            </Pressable>
          ))}
        </View>

        {myCrews && myCrews.length > 0 ? (
          <>
            <Text style={styles.label}>크루 활동으로 공유 (선택)</Text>
            <View style={styles.chips}>
              <Pressable
                onPress={() => setCrewId(null)}
                style={[styles.chip, crewId === null && styles.chipActive]}
              >
                <Text style={[styles.chipText, crewId === null && styles.chipTextActive]}>
                  안 함
                </Text>
              </Pressable>
              {myCrews.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setCrewId(c.id)}
                  style={[styles.chip, crewId === c.id && styles.chipActive]}
                >
                  <Text style={[styles.chipText, crewId === c.id && styles.chipTextActive]}>
                    {c.emoji} {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            {crewId ? (
              <Text style={styles.counter}>크루원에게 알림이 가고 크루 활동에 기록돼요.</Text>
            ) : null}
          </>
        ) : null}

        <Text style={styles.label}>공개 범위</Text>
        <View style={styles.chips}>
          {VISIBILITY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => setVisibility(opt.key)}
              style={[styles.chip, visibility === opt.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, visibility === opt.key && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.counter}>
          {VISIBILITY_OPTIONS.find((o) => o.key === visibility)?.desc}
        </Text>

        <Text style={styles.label}>사진 (선택)</Text>
        {imageUri ? (
          <View>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <Pressable onPress={() => setImageUri(null)} style={styles.removePhoto}>
              <Text style={styles.removePhotoText}>사진 지우기</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={pickImage} style={styles.photoButton}>
            <Text style={styles.photoButtonText}>📷 사진 추가</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="포스트 남기기"
          onPress={submit}
          loading={isPending}
          disabled={body.trim().length === 0}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm + 4,
  },
  input: {
    ...typography.body,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 120,
    textAlignVertical: "top",
  },
  counter: { ...typography.caption, color: colors.subtext, marginTop: spacing.sm },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  locationRowPressed: { backgroundColor: colors.surfaceHigh },
  locationPin: { fontSize: 18 },
  locationValue: { ...typography.body, fontSize: 16, color: colors.text, flex: 1 },
  locationPlaceholder: { ...typography.body, fontSize: 15, color: colors.subtext, flex: 1 },
  locationChevron: { ...typography.title, color: colors.subtext },
  locationClear: { ...typography.body, color: colors.subtext, paddingHorizontal: spacing.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.body, color: colors.subtext },
  chipTextActive: { color: colors.text, fontWeight: "600" },
  photoButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    padding: spacing.lg,
    alignItems: "center",
  },
  photoButtonText: { ...typography.body, color: colors.subtext },
  preview: { width: "100%", height: 200, borderRadius: radius.md },
  removePhoto: { alignItems: "center", padding: spacing.sm },
  removePhotoText: { ...typography.caption, color: colors.danger },
  footer: { paddingVertical: spacing.md },
});
