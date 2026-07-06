import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export default function Verify() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (!supabase || !phone) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: "sms",
    });
    setLoading(false);
    if (error) {
      Alert.alert("인증 실패", "인증번호를 다시 확인해 주세요.");
      return;
    }
    // 세션이 생기면 _layout의 Stack.Protected가 자동으로 (tabs)로 전환한다
  };

  // 버튼을 입력칸 바로 아래(화면 위쪽)에 두어 키보드에 가려지지 않게 한다
  return (
    <Screen>
      <View style={styles.body}>
        <Text style={styles.title}>{phone}로 보낸{"\n"}인증번호 6자리를 입력하세요</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="······"
          placeholderTextColor={colors.subtext}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />
        <View style={styles.action}>
          <Button label="확인" onPress={verify} loading={loading} disabled={code.length !== 6} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: spacing.xl },
  title: { ...typography.heading, color: colors.text, lineHeight: 26, marginBottom: spacing.lg },
  input: {
    ...typography.title,
    fontSize: 32,
    letterSpacing: 12,
    textAlign: "center",
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  action: { marginTop: spacing.lg },
});
