import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiFetchError } from "@/src/lib/api";
import { useAuth } from "@/src/context/auth";
import { colors, radius, spacing, typography } from "@/src/theme/tokens";

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signUp(email.trim().toLowerCase(), password, name.trim());
      router.replace("/(tabs)/browse");
    } catch (err) {
      if (err instanceof ApiFetchError) {
        setError(err.message);
      } else {
        setError("Couldn't create your account. Try again in a moment.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.kav}
      >
        <View style={styles.container}>
          <Text style={styles.eyebrow}>OurStory</Text>
          <Text style={styles.title}>Make a quiet space.</Text>
          <Text style={styles.subtitle}>
            A handle gets generated from your name — you can change it later.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              placeholder="Mara Solís"
              placeholderTextColor={colors.dim}
              style={styles.input}
              editable={!submitting}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="you@example.com"
              placeholderTextColor={colors.dim}
              style={styles.input}
              editable={!submitting}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="At least 8 characters"
              placeholderTextColor={colors.dim}
              style={styles.input}
              editable={!submitting}
              onSubmitEditing={onSubmit}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={onSubmit}
            disabled={submitting || !email || !password || !name}
            style={({ pressed }) => [
              styles.button,
              (submitting || !email || !password || !name) &&
                styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonLabel}>
              {submitting ? "Creating…" : "Create account"}
            </Text>
          </Pressable>

          <View style={styles.altRow}>
            <Text style={styles.altText}>Already have one? </Text>
            <Link href="/(auth)/sign-in" style={styles.altLink}>
              Sign in
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  kav: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  eyebrow: { ...typography.eyebrow, color: colors.dim, marginBottom: spacing.sm },
  title: { ...typography.display, color: colors.ink },
  subtitle: {
    ...typography.body,
    color: colors.body,
    marginBottom: spacing.xl,
  },
  field: { gap: spacing.xs },
  label: { ...typography.label, color: colors.ink },
  input: {
    ...typography.body,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
  },
  error: { ...typography.small, color: colors.danger, marginTop: spacing.xs },
  button: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  buttonDisabled: { backgroundColor: colors.dim },
  buttonPressed: { opacity: 0.85 },
  buttonLabel: { ...typography.button, color: colors.surface },
  altRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  altText: { ...typography.body, color: colors.body },
  altLink: { ...typography.body, color: colors.ink, fontWeight: "600" },
});
