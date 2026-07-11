import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSafetyStore } from "@/features/safety/hooks";
import { useMyContacts } from "@/features/safety/contacts";
import { useMyBuddies } from "@/features/activity/hooks";
import { useMyJoinedCrews } from "@/features/crew/hooks";
import { usePlacePicker } from "@/features/places/store";
import { CHECKIN_TAGS } from "@/features/safety/tags";
import { useCreatePost } from "@/features/feed/hooks";
import { useEffectiveCoords } from "@/stores/location";
import { ACTIVITY_LABELS, colors, radius, spacing, typography, type Activity } from "@/theme/tokens";

const DURATIONS = [2, 4, 6, 8, 10, 12] as const;

// 시작 일시 프리셋 (지금부터 분 단위 오프셋)
const START_OPTIONS = [
  { label: "바로 시작", min: 0 },
  { label: "10분 후", min: 10 },
  { label: "30분 후", min: 30 },
  { label: "1시간 후", min: 60 },
  { label: "2시간 후", min: 120 },
  { label: "3시간 후", min: 180 },
] as const;

const MAX_START_MS = 7 * 24 * 60 * 60 * 1000; // 최대 7일 뒤

// 공개 범위 (비공개 = 피드에 안 올림)
type ShareScope = "public" | "friends" | "private";
const SHARE_OPTIONS: { key: ShareScope; label: string }[] = [
  { key: "public", label: "🌐 전체 공개" },
  { key: "friends", label: "🤝 친구에게만" },
  { key: "private", label: "🔒 비공개" },
];
const SHARE_DESC: Record<ShareScope, string> = {
  public: "주변 모두에게 소식이 공유돼 같은 곳의 버디를 만날 수 있어요.",
  friends: "수락된 버디(친구)에게만 보여요. 낯선 사람에겐 노출되지 않아 더 안전해요.",
  private: "아무에게도 공개하지 않아요. 나만 아는 안전 기록으로 남습니다.",
};

function formatDateTime(d: Date): string {
  return d.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CheckIn() {
  const [title, setTitle] = useState("");
  const [locationName, setLocationName] = useState("");
  const [activity, setActivity] = useState<Activity>("hiking");

  // 시작 일시: 프리셋 오프셋(분) 또는 직접 선택(customStart)
  const [startOffsetMin, setStartOffsetMin] = useState<number | null>(0);
  const [customStart, setCustomStart] = useState<Date | null>(null);

  const [duration, setDuration] = useState<number | null>(4);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [showIosPicker, setShowIosPicker] = useState<"start" | "end" | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [guardianIds, setGuardianIds] = useState<string[]>([]);
  const [myTags, setMyTags] = useState<string[]>([]);
  // 즉시 시작은 전체 공개, 예약(미래)은 안전을 위해 친구에게만이 기본값
  const [shareScope, setShareScope] = useState<ShareScope>("public");
  const [crewId, setCrewId] = useState<string | null>(null);
  const [recordTrack, setRecordTrack] = useState(false);
  const [loading, setLoading] = useState(false);

  const start = useSafetyStore((s) => s.start);
  const { data: contacts } = useMyContacts();
  const { data: buddies } = useMyBuddies();
  const { data: myCrews } = useMyJoinedCrews();
  const { mutateAsync: createPost } = useCreatePost();
  const coords = useEffectiveCoords();

  // 장소 선택 화면에서 고른 장소를 반영 (인스타그램식 위치 추가)
  const pickedPlace = usePlacePicker((s) => s.picked);
  const setPickedPlace = usePlacePicker((s) => s.setPicked);
  useEffect(() => {
    if (pickedPlace) {
      setLocationName(pickedPlace.name);
      setPickedPlace(null);
    }
  }, [pickedPlace, setPickedPlace]);

  const effectiveContactId =
    selectedContactId ?? (contacts && contacts.length === 1 ? contacts[0].id : null);

  const [scopeTouched, setScopeTouched] = useState(false);

  const scheduledStartAt: Date =
    customStart ?? new Date(Date.now() + (startOffsetMin ?? 0) * 60_000);
  const isScheduled = scheduledStartAt.getTime() > Date.now() + 60_000;

  // 사용자가 직접 안 골랐으면: 즉시=전체공개, 예약=친구에게만(안전)
  const effectiveScope: ShareScope = scopeTouched
    ? shareScope
    : isScheduled
      ? "friends"
      : "public";

  const expectedEndAt: Date | null = customEnd
    ? customEnd
    : duration
      ? new Date(scheduledStartAt.getTime() + duration * 3_600_000)
      : null;

  // 안드로이드: 날짜→시간 순서. iOS: datetime 스피너
  const pickCustom = (which: "start" | "end") => {
    const initial =
      which === "start"
        ? (customStart ?? new Date(Date.now() + 60 * 60_000))
        : (customEnd ?? new Date(scheduledStartAt.getTime() + 4 * 3_600_000));
    const minimumDate = which === "start" ? new Date() : scheduledStartAt;
    const maximumDate = which === "start" ? new Date(Date.now() + MAX_START_MS) : undefined;

    const apply = (d: Date) => {
      if (which === "start") {
        setCustomStart(d);
        setStartOffsetMin(null);
      } else {
        setCustomEnd(d);
        setDuration(null);
      }
    };

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: initial,
        mode: "date",
        minimumDate,
        maximumDate,
        onChange: (event, date) => {
          if (event.type !== "set" || !date) return;
          DateTimePickerAndroid.open({
            value: initial,
            mode: "time",
            onChange: (timeEvent, time) => {
              if (timeEvent.type !== "set" || !time) return;
              const d = new Date(date);
              d.setHours(time.getHours(), time.getMinutes(), 0, 0);
              apply(d);
            },
          });
        },
      });
    } else {
      setShowIosPicker(which);
    }
  };

  const begin = async () => {
    if (!expectedEndAt) return;
    if (scheduledStartAt.getTime() > Date.now() + MAX_START_MS) {
      Alert.alert("시작 일시 확인", "시작 시각은 지금부터 최대 7일 뒤까지만 예약할 수 있어요.");
      return;
    }
    if (expectedEndAt.getTime() <= scheduledStartAt.getTime()) {
      Alert.alert("시간 확인", "종료 시각이 시작 시각보다 빨라요. 다시 선택해 주세요.");
      return;
    }
    setLoading(true);
    try {
      await start({
        activity,
        title: title.trim() || null,
        locationName: locationName.trim(),
        tags: myTags,
        scheduledStartAt,
        expectedEndAt,
        contactId: effectiveContactId,
        guardianIds,
        recordTrack,
      });

      if (effectiveScope !== "private") {
        try {
          const checkInId = useSafetyStore.getState().active?.id;
          const what = title.trim() ? ` · ${title.trim()}` : "";
          const body = isScheduled
            ? `⏱ ${formatDateTime(scheduledStartAt)} ${locationName.trim()}에서 ${ACTIVITY_LABELS[activity]} 예정!${what}`
            : `🏔️ ${locationName.trim()}에서 ${ACTIVITY_LABELS[activity]} 시작!${what}`;
          await createPost({
            body,
            tags: ["체크인", ...(isScheduled ? ["예정"] : []), ...myTags],
            activity,
            lat: coords.lat,
            lng: coords.lng,
            visibility: effectiveScope,
            // 실제 체크인 id일 때만 연결 (참가신청 대상)
            checkInId: checkInId && !checkInId.startsWith("local-") ? checkInId : null,
            // 체크인에서 지정한 장소를 포스트 장소로도 표기
            placeName: locationName.trim() || null,
            crewId,
          });
        } catch (e) {
          console.warn("share-to-feed failed:", e);
        }
      }

      router.back();
    } catch (e) {
      Alert.alert("체크인 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>무엇을 하나요?</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="예) 정상 등반 후 백컨트리 하강"
          placeholderTextColor={colors.subtext}
          maxLength={60}
        />

        <Text style={styles.sectionTitle}>어디에서 시작하나요?</Text>
        <Pressable
          onPress={() => router.push("/safety/pick-location")}
          style={({ pressed }) => [styles.locationRow, pressed && styles.locationRowPressed]}
        >
          <Text style={styles.locationPin}>📍</Text>
          {locationName ? (
            <Text style={styles.locationValue}>{locationName}</Text>
          ) : (
            <Text style={styles.locationPlaceholder}>위치 추가</Text>
          )}
          {locationName ? (
            <Pressable onPress={() => setLocationName("")} hitSlop={10}>
              <Text style={styles.locationClear}>✕</Text>
            </Pressable>
          ) : (
            <Text style={styles.locationChevron}>›</Text>
          )}
        </Pressable>

        <Text style={styles.sectionTitle}>어떤 활동인가요?</Text>
        <View style={styles.options}>
          {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setActivity(key)}
              style={[styles.option, activity === key && styles.optionActive]}
            >
              <Text style={[styles.optionText, activity === key && styles.optionTextActive]}>
                {ACTIVITY_LABELS[key]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>시작 일시</Text>
        <View style={styles.options}>
          {START_OPTIONS.map((opt) => {
            const on = !customStart && startOffsetMin === opt.min;
            return (
              <Pressable
                key={opt.min}
                onPress={() => {
                  setStartOffsetMin(opt.min);
                  setCustomStart(null);
                }}
                style={[styles.option, on && styles.optionActive]}
              >
                <Text style={[styles.optionText, on && styles.optionTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => pickCustom("start")}
            style={[styles.option, customStart && styles.optionActive]}
          >
            <Text style={[styles.optionText, customStart && styles.optionTextActive]}>
              {customStart ? `${formatDateTime(customStart)} 시작` : "📅 직접선택 (최대 7일 뒤)"}
            </Text>
          </Pressable>
        </View>
        {isScheduled ? (
          <Text style={styles.scheduleNote}>
            ⏱ {formatDateTime(scheduledStartAt)} 시작 예약 — 시작 시각에 알림을 보내드려요.
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>예상 활동 시간</Text>
        <View style={styles.options}>
          {DURATIONS.map((h) => (
            <Pressable
              key={h}
              onPress={() => {
                setDuration(h);
                setCustomEnd(null);
              }}
              style={[styles.option, duration === h && !customEnd && styles.optionActive]}
            >
              <Text
                style={[styles.optionText, duration === h && !customEnd && styles.optionTextActive]}
              >
                {h}시간
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => pickCustom("end")}
            style={[styles.option, customEnd && styles.optionActive]}
          >
            <Text style={[styles.optionText, customEnd && styles.optionTextActive]}>
              {customEnd ? `${formatDateTime(customEnd)} 종료` : "📅 종료 직접 선택"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>경로 기록</Text>
        <Pressable
          onPress={() => setRecordTrack((v) => !v)}
          style={[styles.trackCard, recordTrack && styles.trackCardActive]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.trackTitle, recordTrack && styles.trackTitleActive]}>
              🛰️ 이동 경로 기록 {recordTrack ? "켜짐" : "꺼짐"}
            </Text>
            <Text style={styles.trackDesc}>
              {recordTrack
                ? "화면이 꺼져도 GPS로 이동 경로와 거리를 기록해요. 체크아웃하면 지도로 볼 수 있어요."
                : "켜면 활동 중 이동한 경로를 지도에 남기고 거리·시간을 자동 계산해요."}
            </Text>
          </View>
          <View style={[styles.trackSwitch, recordTrack && styles.trackSwitchOn]}>
            <View style={[styles.trackKnob, recordTrack && styles.trackKnobOn]} />
          </View>
        </Pressable>

        {showIosPicker && Platform.OS !== "android" ? (
          <DateTimePicker
            value={
              showIosPicker === "start"
                ? (customStart ?? new Date(Date.now() + 60 * 60_000))
                : (customEnd ?? new Date(scheduledStartAt.getTime() + 4 * 3_600_000))
            }
            mode="datetime"
            minimumDate={showIosPicker === "start" ? new Date() : scheduledStartAt}
            maximumDate={
              showIosPicker === "start" ? new Date(Date.now() + MAX_START_MS) : undefined
            }
            onChange={(event, date) => {
              const which = showIosPicker;
              setShowIosPicker(null);
              if (date && which === "start") {
                setCustomStart(date);
                setStartOffsetMin(null);
              } else if (date && which === "end") {
                setCustomEnd(date);
                setDuration(null);
              }
            }}
          />
        ) : null}

        <Text style={styles.sectionTitle}>나의 활동 태그</Text>
        <Text style={styles.tagHint}>
          나를 보여주는 태그를 골라보세요 (여러 개 가능). 주변에 공유하면 태그가 함께 노출돼요.
        </Text>
        <View style={styles.options}>
          {CHECKIN_TAGS.map((tag) => {
            const on = myTags.includes(tag.label);
            return (
              <Pressable
                key={tag.label}
                onPress={() =>
                  setMyTags((prev) =>
                    on ? prev.filter((t) => t !== tag.label) : [...prev, tag.label],
                  )
                }
                style={[styles.option, on && styles.optionActive]}
              >
                <Text style={[styles.optionText, on && styles.optionTextActive]}>
                  {tag.emoji} {tag.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>비상연락처</Text>
        {contacts && contacts.length > 0 ? (
          <View style={styles.contactList}>
            {contacts.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setSelectedContactId(c.id)}
                style={[styles.option, effectiveContactId === c.id && styles.optionActive]}
              >
                <Text
                  style={[
                    styles.optionText,
                    effectiveContactId === c.id && styles.optionTextActive,
                  ]}
                >
                  {c.name} ({c.phone})
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => router.push("/safety/contacts")} style={styles.option}>
              <Text style={styles.optionText}>＋ 관리</Text>
            </Pressable>
          </View>
        ) : (
          <Card style={styles.noContact}>
            <Text style={styles.noContactText}>
              등록된 비상연락처가 없어요. 늦어질 때 알림을 받을 사람을 등록해 주세요.
            </Text>
            <Button
              label="비상연락처 등록"
              variant="secondary"
              onPress={() => router.push("/safety/contacts")}
            />
          </Card>
        )}

        <Text style={styles.sectionTitle}>임시 비상연락 추가 (이번 활동만)</Text>
        <Text style={styles.tagHint}>
          버디를 안전 지킴이로 지정하면, 늦어질 때 그 버디에게도 알림이 가요. 시작할 때 지킴이에게
          &lsquo;지정됐어요&rsquo; 알림이 전송됩니다.
        </Text>
        {buddies && buddies.length > 0 ? (
          <View style={styles.options}>
            {buddies.map((b) => {
              const on = guardianIds.includes(b.userId);
              return (
                <Pressable
                  key={b.userId}
                  onPress={() =>
                    setGuardianIds((prev) =>
                      on ? prev.filter((x) => x !== b.userId) : [...prev, b.userId],
                    )
                  }
                  style={[styles.option, on && styles.optionActive]}
                >
                  <Text style={[styles.optionText, on && styles.optionTextActive]}>
                    🛡️ {b.nickname}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.tagHint}>
            아직 버디가 없어요. 버디를 맺으면 여기서 지킴이로 지정할 수 있어요.
          </Text>
        )}

        {myCrews && myCrews.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>크루 활동으로</Text>
            <View style={styles.options}>
              <Pressable
                onPress={() => setCrewId(null)}
                style={[styles.option, crewId === null && styles.optionActive]}
              >
                <Text style={[styles.optionText, crewId === null && styles.optionTextActive]}>
                  안 함
                </Text>
              </Pressable>
              {myCrews.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setCrewId(c.id)}
                  style={[styles.option, crewId === c.id && styles.optionActive]}
                >
                  <Text style={[styles.optionText, crewId === c.id && styles.optionTextActive]}>
                    {c.emoji} {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>공개 범위</Text>
        <View style={styles.options}>
          {SHARE_OPTIONS.map((opt) => {
            const on = effectiveScope === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => {
                  setShareScope(opt.key);
                  setScopeTouched(true);
                }}
                style={[styles.option, on && styles.optionActive]}
              >
                <Text style={[styles.optionText, on && styles.optionTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.tagHint}>
          {SHARE_DESC[effectiveScope]}
          {isScheduled && !scopeTouched ? " (예약 활동은 안전을 위해 기본이 친구에게만이에요)" : ""}
        </Text>

        <Text style={styles.notice}>
          {expectedEndAt
            ? `${formatDateTime(expectedEndAt)}에서 15분이 지나도 체크아웃하지 않으면, 마지막 위치와 함께 알림이 발송돼요. 종료 30분 전에 리마인더도 보내드려요.`
            : "예상 활동 시간을 선택해 주세요."}
          {" 판정은 서버에서 하므로 산에서 앱이 꺼져도 동작합니다."}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={isScheduled ? "활동 예약" : "활동 시작"}
          onPress={begin}
          loading={loading}
          disabled={!expectedEndAt || locationName.trim().length === 0}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm + 4,
  },
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
  locationPlaceholder: { ...typography.body, fontSize: 16, color: colors.subtext, flex: 1 },
  locationChevron: { ...typography.title, color: colors.subtext },
  locationClear: { ...typography.body, color: colors.subtext, paddingHorizontal: spacing.xs },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { ...typography.body, color: colors.subtext },
  optionTextActive: { color: colors.text, fontWeight: "600" },
  scheduleNote: {
    ...typography.caption,
    color: colors.warn,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  tagHint: {
    ...typography.caption,
    color: colors.subtext,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  trackCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  trackCardActive: { borderColor: colors.primary, backgroundColor: colors.primary + "12" },
  trackTitle: { ...typography.body, fontWeight: "700", color: colors.text },
  trackTitleActive: { color: colors.primary },
  trackDesc: { ...typography.caption, color: colors.subtext, lineHeight: 18, marginTop: 2 },
  trackSwitch: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 3,
    justifyContent: "center",
  },
  trackSwitchOn: { backgroundColor: colors.primary },
  trackKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    alignSelf: "flex-start",
  },
  trackKnobOn: { alignSelf: "flex-end" },
  contactList: { gap: spacing.sm },
  noContact: { gap: spacing.sm + 4 },
  noContactText: { ...typography.body, color: colors.subtext, lineHeight: 21 },
  notice: {
    ...typography.caption,
    color: colors.subtext,
    lineHeight: 19,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  footer: { paddingVertical: spacing.md },
});
