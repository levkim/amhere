import { useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAddContact, useDeleteContact, useMyContacts } from "@/features/safety/contacts";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export default function EmergencyContacts() {
  const { data: contacts } = useMyContacts();
  const { mutateAsync: addContact, isPending: adding } = useAddContact();
  const { mutate: deleteContact } = useDeleteContact();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");

  const add = async () => {
    try {
      await addContact({
        name: name.trim(),
        phone: phone.trim(),
        relation: relation.trim() || null,
      });
      setName("");
      setPhone("");
      setRelation("");
    } catch (e) {
      Alert.alert("등록 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    }
  };

  const confirmDelete = (id: string, contactName: string) => {
    Alert.alert("삭제", `${contactName}님을 비상연락처에서 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => deleteContact(id) },
    ]);
  };

  return (
    <Screen padded={false}>
      <FlatList
        data={contacts}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.name}>
                  {item.name}
                  {item.relation ? ` · ${item.relation}` : ""}
                </Text>
                <Text style={styles.phone}>{item.phone}</Text>
              </View>
              <Button
                label="삭제"
                variant="danger"
                onPress={() => confirmDelete(item.id, item.name)}
              />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            emoji="🛡️"
            title="아직 비상연락처가 없어요"
            description="체크아웃이 늦어질 때 알림을 받을 가족·친구를 아래에서 등록해 주세요."
          />
        }
        ListFooterComponent={
          <Card style={styles.form}>
            <Text style={styles.formTitle}>새 연락처 추가</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="이름 (예: 엄마)"
              placeholderTextColor={colors.subtext}
            />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="전화번호 (예: 010-1234-5678)"
              placeholderTextColor={colors.subtext}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              value={relation}
              onChangeText={setRelation}
              placeholder="관계 (선택, 예: 가족)"
              placeholderTextColor={colors.subtext}
            />
            <Button
              label="추가"
              onPress={add}
              loading={adding}
              disabled={name.trim().length === 0 || phone.replace(/\D/g, "").length < 10}
            />
          </Card>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  card: { marginBottom: spacing.sm + 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  info: { gap: spacing.xs, flex: 1, marginRight: spacing.sm },
  name: { ...typography.heading, color: colors.text },
  phone: { ...typography.body, color: colors.subtext },
  form: { marginTop: spacing.md, gap: spacing.sm + 4 },
  formTitle: { ...typography.heading, color: colors.text },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
});
