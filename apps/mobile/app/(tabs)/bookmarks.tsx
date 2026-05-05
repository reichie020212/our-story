import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";

import { StoryCard } from "@/src/components/StoryCard";
import { fetchBookmarks, queryKeys } from "@/src/lib/queries";
import { colors, spacing, typography } from "@/src/theme/tokens";

export default function BookmarksScreen() {
  const query = useQuery({
    queryKey: queryKeys.bookmarks(),
    queryFn: fetchBookmarks,
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Saved</Text>
        <Text style={styles.title}>Bookmarks</Text>
      </View>

      {query.status === "pending" ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.dim} />
        </View>
      ) : query.status === "error" ? (
        <View style={styles.center}>
          <Text style={styles.bodyText}>
            {"Couldn't load your bookmarks."}
          </Text>
          <Text style={styles.dim}>{(query.error as Error).message}</Text>
        </View>
      ) : query.data.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.bodyText}>No bookmarks yet.</Text>
          <Text style={styles.dim}>
            Tap the save icon on any story to keep it here.
          </Text>
        </View>
      ) : (
        <FlashList
          data={query.data}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <StoryCard story={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => query.refetch()}
              tintColor={colors.dim}
            />
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
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  eyebrow: { ...typography.eyebrow, color: colors.dim },
  title: { ...typography.display, color: colors.ink },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.xs,
  },
  bodyText: { ...typography.body, color: colors.body },
  dim: { ...typography.small, color: colors.dim, textAlign: "center" },
});
