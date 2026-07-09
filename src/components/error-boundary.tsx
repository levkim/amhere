import { Component, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/theme/tokens";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** 화면 렌더 중 에러가 나도 앱이 꺼지지 않고 메시지를 보여준다 (원인 파악용). */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.warn("ErrorBoundary caught:", error?.message, error?.stack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.wrap}>
        <Text style={styles.emoji}>😵‍💫</Text>
        <Text style={styles.title}>문제가 발생했어요</Text>
        <Text style={styles.hint}>아래 내용을 개발자에게 보여주면 바로 고칠 수 있어요.</Text>
        <ScrollView style={styles.box}>
          <Text selectable style={styles.msg}>
            {error?.message}
            {"\n\n"}
            {error?.stack}
          </Text>
        </ScrollView>
        <Text style={styles.retry} onPress={() => this.setState({ error: null })}>
          다시 시도
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, justifyContent: "center" },
  emoji: { fontSize: 44, textAlign: "center" },
  title: { ...typography.title, color: colors.text, textAlign: "center", marginTop: spacing.md },
  hint: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  box: {
    maxHeight: 300,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  msg: { ...typography.caption, color: colors.danger, fontFamily: "monospace", lineHeight: 18 },
  retry: {
    ...typography.heading,
    color: colors.primary,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
