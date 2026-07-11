import { ScrollView, StyleSheet, Text } from "react-native";
import { Screen } from "@/components/ui/screen";
import { colors, spacing, typography } from "@/theme/tokens";

/** 약관 문서 공통 레이아웃 — sections: [제목, 본문] 쌍 배열 */
export function LegalDoc({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: [string, string][];
}) {
  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.updated}>시행일: {updated}</Text>
        {sections.map(([head, text]) => (
          <Text key={head} style={styles.section}>
            <Text style={styles.head}>{head}{"\n"}</Text>
            <Text style={styles.text}>{text}</Text>
          </Text>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  title: { ...typography.title, color: colors.text },
  updated: { ...typography.caption, color: colors.subtext },
  section: { lineHeight: 21 },
  head: { ...typography.heading, fontSize: 15, color: colors.text },
  text: { ...typography.body, fontSize: 13, color: colors.subtext },
});
