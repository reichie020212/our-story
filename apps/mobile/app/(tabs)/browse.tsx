import { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { StoryWire } from "@our-story/api-types";

import { StoryCard } from "@/src/components/StoryCard";
import { fetchStoriesPage, queryKeys } from "@/src/lib/queries";
import { colors, radius, spacing, typography } from "@/src/theme/tokens";

const PAGE_SIZE = 12;

export default function BrowseScreen() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  // Tiny inline debounce so every keystroke doesn't fire a request.
  // Keeping it inline avoids pulling in a hook lib for one usage.
  const onChangeQ = (next: string) => {
    setQ(next);
    const trimmed = next.trim();
    const handle = setTimeout(() => setDebounced(trimmed), 300);
    return () => clearTimeout(handle);
  };

  const query = useInfiniteQuery({
    queryKey: queryKeys.stories({ q: debounced || undefined }),
    queryFn: ({ pageParam }) =>
      fetchStoriesPage({
        cursor: pageParam ?? undefined,
        limit: PAGE_SIZE,
        q: debounced || undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const stories: StoryWire[] = query.data?.pages.flatMap((p) => p.stories) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Browse</Text>
        <Text style={styles.title}>The library</Text>
        <TextInput
          value={q}
          onChangeText={onChangeQ}
          placeholder="Search title, author, tag…"
          placeholderTextColor={colors.dim}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.search}
          returnKeyType="search"
        />
      </View>

      {query.status === "pending" ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.dim} />
        </View>
      ) : query.status === "error" ? (
        <View style={styles.center}>
          <Text style={styles.bodyText}>{"Couldn't load stories."}</Text>
          <Text style={styles.dimText}>
            {(query.error as Error).message}
          </Text>
        </View>
      ) : stories.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.bodyText}>
            {debounced ? `Nothing matches "${debounced}".` : "No stories yet."}
          </Text>
        </View>
      ) : (
        <FlashList
          data={stories}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <StoryCard story={item} />}
          contentContainerStyle={styles.list}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              query.fetchNextPage();
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching && !query.isFetchingNextPage}
              onRefresh={() => query.refetch()}
              tintColor={colors.dim}
            />
          }
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.dim} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  eyebrow: { ...typography.eyebrow, color: colors.dim },
  title: { ...typography.display, color: colors.ink },
  search: {
    ...typography.body,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.md,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.xs,
  },
  footer: { paddingVertical: spacing.lg, alignItems: "center" },
  bodyText: { ...typography.body, color: colors.body },
  dimText: { ...typography.small, color: colors.dim, textAlign: "center" },
});
