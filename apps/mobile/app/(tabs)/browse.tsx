import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@/src/theme/tokens";

export default function BrowseScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>Browse</Text>
        <Text style={styles.title}>The library</Text>
        <Text style={styles.body}>
          Story list lands in the next commit — useInfiniteQuery against
          /api/v1/stories with FlashList rendering.
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
