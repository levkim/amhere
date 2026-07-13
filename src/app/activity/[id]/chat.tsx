import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { useActivityMessages, useSendActivityMessage } from "@/features/activity/hooks";
import { useMyUserId } from "@/features/matching/hooks";
import type { ActivityMessage } from "@/features/activity/api";
import { LIVEMAP_MSG } from "@/features/activity/live";
import { colors, radius, spacing, typography } from "@/theme/tokens";

function Bubble({
  message,
  mine,
  checkInId,
}: {
  message: ActivityMessage;
  mine: boolean;
  checkInId: string;
}) {
  // 라이브 맵 공유 메시지 → 탭하면 라이브 맵이 열리는 카드
  const isLivemap = message.body === LIVEMAP_MSG;
  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMine]}>
        {!mine ? <Text style={styles.sender}>{message.senderNickname}</Text> : null}
        {isLivemap ? (
          <Pressable
            onPress={() => router.push(`/activity/${checkInId}/live`)}
            style={styles.livemapCard}
          >
            <Text style={styles.livemapEmoji}>📡</Text>
            <View>
              <Text style={styles.livemapTitle}>라이브 맵</Text>
              <Text style={styles.livemapDesc}>동행들의 실시간 위치 보기 →</Text>
            </View>
          </Pressable>
        ) : (
          <View style={[styles.bubble, mine && styles.bubbleMine]}>
            <Text style={styles.bubbleText}>{message.body}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ActivityChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const checkInId = id ?? "";
  const myId = useMyUserId();
  const { data: messages } = useActivityMessages(checkInId);
  const { mutateAsync, isPending } = useSendActivityMessage(checkInId);
  const [draft, setDraft] = useState("");

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    await mutateAsync(body).catch(() => setDraft(body));
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <Bubble message={item} mine={item.senderId === myId} checkInId={checkInId} />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.notice}>이 활동에 참가한 사람들의 단체 채팅이에요.</Text>
          }
        />
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="메시지 보내기"
            placeholderTextColor={colors.subtext}
            multiline
          />
          <Pressable
            onPress={send}
            disabled={isPending || draft.trim().length === 0}
            style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.sendLabel}>전송</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.md, gap: spacing.sm },
  notice: { ...typography.caption, color: colors.subtext, textAlign: "center", marginBottom: spacing.sm },
  bubbleRow: { flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleWrap: { maxWidth: "78%" },
  bubbleWrapMine: { alignItems: "flex-end" },
  sender: { ...typography.caption, color: colors.subtext, marginBottom: 2, marginLeft: spacing.sm },
  bubble: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleText: { ...typography.body, color: colors.text, lineHeight: 21 },
  // 라이브 맵 공유 카드
  livemapCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  livemapEmoji: { fontSize: 24 },
  livemapTitle: { ...typography.body, fontWeight: "800", color: colors.accent },
  livemapDesc: { ...typography.caption, color: colors.subtext },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  sendLabel: { ...typography.body, fontWeight: "600", color: colors.text },
});
