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
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { StoryWire } from "@our-story/api-types";

import { FeaturedCard } from "@/src/components/FeaturedCard";
import { StoryCard } from "@/src/components/StoryCard";
import { TagFilterRow } from "@/src/components/TagFilterRow";
import {
  fetchFeatured,
  fetchStoriesPage,
  fetchTrendingTags,
  queryKeys,
} from "@/src/lib/queries";
import { colors, radius, spacing, typography } from "@/src/theme/tokens";

const PAGE_SIZE = 12;
const MAX_CHIPS = 8;

export default function BrowseScreen() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Tiny inline debounce so every keystroke doesn't fire a request.
  // Typing a search query also clears any active tag filter — they're
  // mutually exclusive in this UI to keep the mental model simple.
  const onChangeQ = (next: string) => {
    setQ(next);
    if (next.length > 0 && activeTag) setActiveTag(null);
    const trimmed = next.trim();
    const handle = setTimeout(() => setDebounced(trimmed), 300);
    return () => clearTimeout(handle);
  };

  const onSelectTag = (tag: string | null) => {
    setActiveTag(tag);
    if (tag && q) {
      setQ("");
      setDebounced("");
    }
  };

  const query = useInfiniteQuery({
    queryKey: [
      ...queryKeys.stories({ q: debounced || undefined }),
      { tag: activeTag },
    ],
    queryFn: ({ pageParam }) =>
      fetchStoriesPage({
        cursor: pageParam ?? undefined,
        limit: PAGE_SIZE,
        q: debounced || undefined,
        tag: activeTag ?? undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  // Featured story rides on top of the list as a header. Hidden once
  // the user is searching or filtering — both modes are about
  // narrowing down, so the editorial pick gets in the way.
  const featuredQuery = useQuery({
    queryKey: queryKeys.featured(),
    queryFn: fetchFeatured,
    enabled: debounced.length === 0 && !activeTag,
  });

  const tagsQuery = useQuery({
    queryKey: queryKeys.trendingTags(),
    queryFn: fetchTrendingTags,
    enabled: debounced.length === 0,
  });

  const stories: StoryWire[] = query.data?.pages.flatMap((p) => p.stories) ?? [];

  // Drop the featured story from the regular list so it doesn't show
  // up twice (once in the hero card, once below).
  const featuredId = featuredQuery.data?.id;
  const listStories = featuredId
    ? stories.filter((s) => s.id !== featuredId)
    : stories;

  const tagOptions =
    tagsQuery.data?.slice(0, MAX_CHIPS).map((t) => t.tag) ?? [];

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

      {debounced.length === 0 && tagOptions.length > 0 ? (
        <TagFilterRow
          tags={tagOptions}
          active={activeTag}
          onSelect={onSelectTag}
        />
      ) : null}

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
            {debounced
              ? `Nothing matches "${debounced}".`
              : activeTag
                ? `Nothing tagged "${activeTag}" yet.`
                : "No stories yet."}
          </Text>
        </View>
      ) : (
        <FlashList
          data={listStories}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <StoryCard story={item} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            featuredQuery.data ? (
              <FeaturedCard story={featuredQuery.data} />
            ) : null
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              query.fetchNextPage();
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching && !query.isFetchingNextPage}
              onRefresh={() => {
                query.refetch();
                featuredQuery.refetch();
                tagsQuery.refetch();
              }}
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
