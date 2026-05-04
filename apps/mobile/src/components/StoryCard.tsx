import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { StoryWire } from "@our-story/api-types";
import { colors, radius, spacing, typography } from "@/src/theme/tokens";

const PAGE_LIMIT_GUESS_CHARS = 180;

export function StoryCard({ story }: { story: StoryWire }) {
  const router = useRouter();
  const synopsis =
    story.synopsis.length > PAGE_LIMIT_GUESS_CHARS
      ? story.synopsis.slice(0, PAGE_LIMIT_GUESS_CHARS).trim() + "…"
      : story.synopsis;

  return (
    <Pressable
      onPress={() => router.push(`/s/${story.slug}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Text style={styles.meta}>
        {story.author.handle} · {story.minutes} min · {story.genre}
      </Text>
      <Text style={styles.title}>{story.title}</Text>
      {synopsis ? <Text style={styles.synopsis}>{synopsis}</Text> : null}
      {story.tags.length > 0 ? (
        <View style={styles.tags}>
          {story.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  cardPressed: { opacity: 0.85 },
  meta: { ...typography.small, color: colors.dim },
  title: { ...typography.title, color: colors.ink, marginTop: spacing.xs },
  synopsis: {
    ...typography.body,
    color: colors.body,
    marginTop: spacing.xs,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  tagText: { ...typography.small, color: colors.body },
});
