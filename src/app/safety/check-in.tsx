import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSafetyStore } from "@/features/safety/hooks";
import { useMyContacts } from "@/features/safety/contacts";
import { usePlacePicker } from "@/features/places/store";
import { ACTIVITY_LABELS, colors, radius, spacing, typography, type Activity } from "@/theme/tokens";

const DURATIONS = [2, 4, 6, 8, 10, 12] as const;

function formatDateTime(d: Date): string {
  return d.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CheckIn() {
  const [locationName, setLocationName] = useState("");
  const [activity, setActivity] = useState<Activity>("hiking");
  const [duration, setDuration] = useState<number | null>(4);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const start = useSafetyStore((s) => s.start);
  const { data: contacts } = useMyContacts();

  // 장소 선택 화면에서 고른 장소를 반영 (인스타그램식 위치 추가)
  const pickedPlace = usePlacePicker((s) => s.picked);
  const setPickedPlace = usePlacePicker((s) => s.setPicked);
  useEffect(() => {
    if (pickedPlace) {
      setLocationName(pickedPlace.name);
      setPickedPlace(null); // 반영 후 비워서 재적용 방지
    }
  }, [pickedPlace, setPickedPlace]);

  // 연락처가 하나뿐이면 자동 선택
  const effectiveContactId =
    selectedContactId ?? (contacts && contacts.length === 1 ? contacts[0].id : null);

  const expectedEndAt: Date | null = customEnd
    ? customEnd
    : duration
      ? new Date(Date.now() + duration * 3_600_000)
      : null;

  const pickCustomEnd = () => {
    const initial = customEnd ?? new Date(Date.now() + 4 * 3_600_000);
    if (Platform.OS === "android") {
      // 안드로이드: 날짜 → 시간 순서로 네이티브 선택창
      DateTimePickerAndroid.open({
        value: initial,
        mode: "date",
        minimumDate: new Date(),
        onChange: (event, date) => {
          if (event.type !== "set" || !date) return;
          DateTimePickerAndroid.open({
            value: initial,
            mode: "time",
            onChange: (timeEvent, time) => {
              if (timeEvent.type !== "set" || !time) return;
              const end = new Date(date);
              end.setHours(time.getHours(), time.getMinutes(), 0, 0);
              setCustomEnd(end);
              setDuration(null);
            },
          });
        },
      });
    } else {
      setShowIosPicker(true);
    }
  };

  const begin = async () => {
    if (!expectedEndAt) return;
    if (expectedEndAt.getTime() <= Date.now()) {
      Alert.alert("시간 확인", "종료 시간이 이미 지났어요. 다시 선택해 주세요.");
      return;
    }
    setLoading(true);
    try {
      await start({
        activity,
        locationName: locationName.trim(),
        expectedEndAt,
        contactId: effectiveContactId,
      });
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
        <Text style={styles.sectionTitle}>어디에서 하시나요?</Text>
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
            onPress={pickCustomEnd}
            style={[styles.option, customEnd && styles.optionActive]}
          >
            <Text style={[styles.optionText, customEnd && styles.optionTextActive]}>
              {customEnd ? `${formatDateTime(customEnd)} 종료` : "📅 직접 선택"}
            </Text>
          </Pressable>
        </View>

        {showIosPicker && Platform.OS !== "android" ? (
          <DateTimePicker
            value={customEnd ?? new Date(Date.now() + 4 * 3_600_000)}
            mode="datetime"
            minimumDate={new Date()}
            onChange={(event, date) => {
              setShowIosPicker(false);
              if (date) {
                setCustomEnd(date);
                setDuration(null);
              }
            }}
          />
        ) : null}

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

        <Text style={styles.notice}>
          {expectedEndAt
            ? `${formatDateTime(expectedEndAt)}에서 15분이 지나도 체크아웃하지 않으면, 마지막 위치와 함께 알림이 발송돼요. 종료 30분 전에 리마인더도 보내드려요.`
            : "예상 활동 시간을 선택해 주세요."}
          {" 판정은 서버에서 하므로 산에서 앱이 꺼져도 동작합니다."}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="활동 시작"
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
