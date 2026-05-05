import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { StoryWire } from "@our-story/api-types";
import { colors, radius, spacing, typography } from "@/src/theme/tokens";

const SYNOPSIS_MAX = 220;

export function FeaturedCard({ story }: { story: StoryWire }) {
  const router = useRouter();
  const synopsis =
    story.synopsis.length > SYNOPSIS_MAX
      ? story.synopsis.slice(0, SYNOPSIS_MAX).trim() + "…"
      : story.synopsis;

  return (
    <Pressable
      onPress={() => router.push(`/s/${story.slug}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.eyebrow}>Featured</Text>
      <Text style={styles.title}>{story.title}</Text>
      {synopsis ? <Text style={styles.synopsis}>{synopsis}</Text> : null}
      <Text style={styles.meta}>
        {story.author.handle} · {story.minutes} min · {story.genre}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.92 },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.accentMuted,
  },
  title: {
    ...typography.title,
    color: colors.surface,
    marginTop: spacing.xs,
  },
  synopsis: {
    ...typography.body,
    color: "#d6d2c5",
    marginTop: spacing.sm,
  },
  meta: {
    ...typography.small,
    color: "#a8a39a",
    marginTop: spacing.md,
  },
});
