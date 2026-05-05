import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { StoryCard } from "@/src/components/StoryCard";
import { useAuth } from "@/src/context/auth";
import { fetchMyStories, queryKeys } from "@/src/lib/queries";
import { colors, radius, spacing, typography } from "@/src/theme/tokens";

export default function MeScreen() {
  const { state, signOut } = useAuth();
  const router = useRouter();

  const myStoriesQuery = useQuery({
    queryKey: queryKeys.myStories(),
    queryFn: fetchMyStories,
    enabled: state.status === "signed-in",
  });

  if (state.status !== "signed-in") return null;
  const { user } = state;

  const onSignOut = async () => {
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  const stories = myStoriesQuery.data ?? [];
  const drafts = stories.filter((s) => s.status === "draft");
  const published = stories.filter((s) => s.status === "published");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
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

        <View style={styles.divider} />

        {myStoriesQuery.status === "pending" ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.dim} />
          </View>
        ) : myStoriesQuery.status === "error" ? (
          <Text style={styles.errorText}>
            {"Couldn't load your stories."}
          </Text>
        ) : stories.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.bodyText}>
              You haven&apos;t written anything yet.
            </Text>
            <Text style={styles.dim}>
              Composing on mobile is on the roadmap; for now, write on the
              web and your stories will show up here.
            </Text>
          </View>
        ) : (
          <>
            {published.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Published</Text>
                {published.map((s) => (
                  <StoryCard key={s.id} story={s} />
                ))}
              </View>
            ) : null}
            {drafts.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Drafts</Text>
                {drafts.map((s) => (
                  <StoryCard key={s.id} story={s} />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  container: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
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
  section: { marginTop: spacing.md },
  sectionLabel: {
    ...typography.eyebrow,
    color: colors.dim,
    marginBottom: spacing.sm,
  },
  center: { alignItems: "center", paddingVertical: spacing.xl },
  empty: { gap: spacing.xs, alignItems: "flex-start" },
  bodyText: { ...typography.body, color: colors.body },
  errorText: { ...typography.body, color: colors.danger },
  dim: { ...typography.small, color: colors.dim, lineHeight: 18 },
});
