import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@/src/theme/tokens";

export default function BookmarksScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>Saved</Text>
        <Text style={styles.title}>Bookmarks</Text>
        <Text style={styles.body}>
          Coming next — /api/v1/me/bookmarks rendered with the same card
          shape as Browse.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  container: { padding: spacing.lg, gap: spacing.sm },
  eyebrow: { ...typography.eyebrow, color: colors.dim },
  title: { ...typography.display, color: colors.ink },
  body: { ...typography.body, color: colors.body, marginTop: spacing.sm },
});
