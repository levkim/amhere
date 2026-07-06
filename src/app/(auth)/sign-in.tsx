import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing, typography } from "@/theme/tokens";

/** 01012345678 → +821012345678 */
function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `+82${digits.slice(1)}` : `+${digits}`;
}

export default function SignIn() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!supabase) return;
    const e164 = toE164(phone);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    setLoading(false);
    if (error) {
      Alert.alert("인증번호 전송 실패", error.message);
      return;
    }
    router.push({ pathname: "/verify", params: { phone: e164 } });
  };

  // 버튼을 입력칸 바로 아래(화면 위쪽)에 두어 키보드에 가려지지 않게 한다
  return (
    <Screen>
      <View style={styles.body}>
        <Text style={styles.label}>전화번호</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="010-0000-0000"
          placeholderTextColor={colors.subtext}
          keyboardType="phone-pad"
          autoFocus
        />
        <Text style={styles.hint}>인증번호를 문자로 보내드려요.</Text>
        <View style={styles.action}>
          <Button
            label="인증번호 받기"
            onPress={sendOtp}
            loading={loading}
            disabled={phone.replace(/\D/g, "").length < 10}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: spacing.xl },
  label: { ...typography.caption, color: colors.subtext, marginBottom: spacing.sm },
  input: {
    ...typography.title,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  hint: { ...typography.caption, color: colors.subtext, marginTop: spacing.sm },
  action: { marginTop: spacing.lg },
});
