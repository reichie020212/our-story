import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiFetchError } from "@/src/lib/api";
import { useAuth } from "@/src/context/auth";
import { colors, radius, spacing, typography } from "@/src/theme/tokens";

// Shown right after mobile signup, and as the fallback target when an
// existing user tries to sign in but their email isn't verified yet.
// `reason` lets the copy adapt (post-signup vs. blocked-signin).
export default function CheckEmailScreen() {
  const { resendVerification } = useAuth();
  const router = useRouter();
  const { email, reason } = useLocalSearchParams<{
    email?: string;
    reason?: string;
  }>();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const fromSignin = reason === "signin";

  const onResend = async () => {
    if (!email) {
      setError("Missing email — go back and sign in again to retry.");
      return;
    }
    setError(null);
    setStatus("sending");
    try {
      await resendVerification(email);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof ApiFetchError
          ? err.message
          : "Couldn't send a new link. Try again in a moment.",
      );
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
          <Text style={styles.title}>
            {fromSignin ? "Verify your email." : "Check your email."}
          </Text>
          <Text style={styles.subtitle}>
            {fromSignin
              ? `We sent a verification link to ${email ?? "your inbox"} when you signed up. Click it to activate your account, then sign in again.`
              : `We sent a verification link to ${email ?? "your inbox"}. Click it to activate your account — it expires in 24 hours.`}
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={onResend}
            disabled={status === "sending" || status === "sent"}
            style={({ pressed }) => [
              styles.button,
              (status === "sending" || status === "sent") &&
                styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonLabel}>
              {status === "sent"
                ? "✓ Sent — check again in a minute"
                : status === "sending"
                  ? "Sending…"
                  : "Resend the link"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/(auth)/sign-in")}
            style={({ pressed }) => [
              styles.ghost,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.ghostLabel}>Back to sign in</Text>
          </Pressable>

          <View style={styles.altRow}>
            <Text style={styles.altText}>Didn&apos;t get the email? </Text>
            <Link href="/(auth)/sign-up" style={styles.altLink}>
              Try a different address
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
  eyebrow: {
    ...typography.eyebrow,
    color: colors.dim,
    marginBottom: spacing.sm,
  },
  title: { ...typography.display, color: colors.ink },
  subtitle: {
    ...typography.body,
    color: colors.body,
    marginBottom: spacing.lg,
  },
  error: {
    ...typography.small,
    color: colors.danger,
    marginTop: spacing.xs,
  },
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
  ghost: {
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  ghostLabel: { ...typography.body, color: colors.body },
  altRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  altText: { ...typography.body, color: colors.body },
  altLink: { ...typography.body, color: colors.ink, fontWeight: "600" },
});
