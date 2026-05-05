import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StoryWire } from "@our-story/api-types";

import {
  fetchStory,
  queryKeys,
  toggleBookmark,
  toggleLike,
} from "@/src/lib/queries";
import { colors, radius, spacing, typography } from "@/src/theme/tokens";

export default function ReaderScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const slugStr = typeof slug === "string" ? slug : "";
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.story(slugStr),
    queryFn: () => fetchStory(slugStr),
    enabled: slugStr.length > 0,
  });

  // Optimistic toggle: update the cached story immediately, then
  // reconcile with the server. Bookmark toggles also invalidate the
  // bookmarks list so the Bookmarks tab refreshes on next visit.
  const likeMutation = useMutation({
    mutationFn: (next: boolean) => toggleLike(slugStr, next),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: queryKeys.story(slugStr) });
      const prev = qc.getQueryData<StoryWire>(queryKeys.story(slugStr));
      if (prev) {
        qc.setQueryData<StoryWire>(queryKeys.story(slugStr), {
          ...prev,
          liked: next,
          likes: prev.likes + (next ? 1 : -1),
        });
      }
      return { prev };
    },
    onError: (_err, _next, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.story(slugStr), ctx.prev);
    },
    onSettled: (data) => {
      if (data) {
        qc.setQueryData<StoryWire>(queryKeys.story(slugStr), (prev) =>
          prev ? { ...prev, liked: data.liked, likes: data.likeCount } : prev,
        );
      }
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: (next: boolean) => toggleBookmark(slugStr, next),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: queryKeys.story(slugStr) });
      const prev = qc.getQueryData<StoryWire>(queryKeys.story(slugStr));
      if (prev) {
        qc.setQueryData<StoryWire>(queryKeys.story(slugStr), {
          ...prev,
          bookmarked: next,
        });
      }
      return { prev };
    },
    onError: (_err, _next, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.story(slugStr), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bookmarks() });
    },
  });

  const story = query.data;
  const liked = story?.liked ?? false;
  const bookmarked = story?.bookmarked ?? false;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backLabel}>‹ Back</Text>
        </Pressable>
      </View>

      {query.status === "pending" ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.dim} />
        </View>
      ) : query.status === "error" ? (
        <View style={styles.center}>
          <Text style={styles.bodyText}>{"Couldn't load this story."}</Text>
          <Text style={styles.dim}>{(query.error as Error).message}</Text>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.eyebrow}>
              {story!.author.handle} · {story!.minutes} min · {story!.genre}
            </Text>
            <Text style={styles.title}>{story!.title}</Text>
            {story!.synopsis ? (
              <Text style={styles.synopsis}>{story!.synopsis}</Text>
            ) : null}

            <View style={styles.divider} />

            {story!.body.map((para, i) => (
              <Text key={i} style={styles.paragraph}>
                {para}
              </Text>
            ))}

            {story!.tags.length > 0 ? (
              <View style={styles.tagRow}>
                {story!.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.footerByline}>— {story!.author.name}</Text>
          </ScrollView>

          <View style={styles.toolbar}>
            <Pressable
              onPress={() => likeMutation.mutate(!liked)}
              style={({ pressed }) => [
                styles.toolButton,
                pressed && styles.toolPressed,
              ]}
              hitSlop={6}
            >
              <Text
                style={[
                  styles.toolGlyph,
                  liked && { color: colors.accent },
                ]}
              >
                {liked ? "♥" : "♡"}
              </Text>
              <Text style={styles.toolCount}>{story!.likes}</Text>
            </Pressable>

            <Pressable
              onPress={() => bookmarkMutation.mutate(!bookmarked)}
              style={({ pressed }) => [
                styles.toolButton,
                pressed && styles.toolPressed,
              ]}
              hitSlop={6}
            >
              <Text
                style={[
                  styles.toolGlyph,
                  bookmarked && { color: colors.accent },
                ]}
              >
                {bookmarked ? "■" : "□"}
              </Text>
              <Text style={styles.toolLabel}>
                {bookmarked ? "Saved" : "Save"}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  topbar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  back: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  backLabel: { ...typography.body, color: colors.ink },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  eyebrow: { ...typography.eyebrow, color: colors.dim },
  title: { ...typography.display, color: colors.ink, marginTop: spacing.xs },
  synopsis: {
    ...typography.body,
    color: colors.body,
    fontStyle: "italic",
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  paragraph: { ...typography.reader, color: colors.ink, marginBottom: spacing.sm },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  tagText: { ...typography.small, color: colors.body },
  footerByline: {
    ...typography.body,
    color: colors.dim,
    marginTop: spacing.xl,
    textAlign: "right",
  },
  bodyText: { ...typography.body, color: colors.body },
  dim: { ...typography.small, color: colors.dim, textAlign: "center" },

  toolbar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  toolButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  toolPressed: { opacity: 0.6 },
  toolGlyph: {
    fontSize: 22,
    color: colors.body,
    lineHeight: 24,
  },
  toolCount: { ...typography.label, color: colors.body },
  toolLabel: { ...typography.label, color: colors.body },
});
