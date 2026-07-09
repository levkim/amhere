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
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { useCrewMessages, useSendCrewMessage } from "@/features/crew/hooks";
import { useMyUserId } from "@/features/matching/hooks";
import type { CrewMessage } from "@/features/crew/api";
import { colors, radius, spacing, typography } from "@/theme/tokens";

function Bubble({ message, mine }: { message: CrewMessage; mine: boolean }) {
  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMine]}>
        {!mine ? <Text style={styles.sender}>{message.senderNickname}</Text> : null}
        <View style={[styles.bubble, mine && styles.bubbleMine]}>
          <Text style={styles.bubbleText}>{message.body}</Text>
        </View>
      </View>
    </View>
  );
}

export default function CrewChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const crewId = id ?? "";
  const myId = useMyUserId();
  const { data: messages } = useCrewMessages(crewId);
  const { mutateAsync, isPending } = useSendCrewMessage(crewId);
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
          renderItem={({ item }) => <Bubble message={item} mine={item.senderId === myId} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.notice}>크루원 전체가 함께 보는 채팅이에요.</Text>
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
  sendLabel: { ...typography.body, fontWeight: "700", color: colors.invert },
});
