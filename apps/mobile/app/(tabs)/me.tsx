import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/auth";
import { colors, radius, spacing, typography } from "@/src/theme/tokens";

export default function MeScreen() {
  const { state, signOut } = useAuth();
  const router = useRouter();

  if (state.status !== "signed-in") return null;
  const { user } = state;

  const onSignOut = async () => {
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>Me</Text>
        <Text style={styles.title}>{user.name}</Text>
        <Text style={styles.handle}>{user.handle}</Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.email}</Text>
        </View>

        <Pressable
          onPress={onSignOut}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonLabel}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  container: { padding: spacing.lg, gap: spacing.sm },
  eyebrow: { ...typography.eyebrow, color: colors.dim },
  title: { ...typography.display, color: colors.ink },
  handle: { ...typography.body, color: colors.body },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.lg,
  },
  row: { gap: spacing.xs, marginBottom: spacing.lg },
  label: { ...typography.label, color: colors.dim },
  value: { ...typography.body, color: colors.ink },
  button: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.ink,
    paddingVertical: spacing.md - 2,
    alignItems: "center",
    marginTop: spacing.md,
  },
  buttonPressed: { opacity: 0.7 },
  buttonLabel: { ...typography.button, color: colors.ink },
});
