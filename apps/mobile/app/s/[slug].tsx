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
import { useQuery } from "@tanstack/react-query";

import { fetchStory, queryKeys } from "@/src/lib/queries";
import { colors, radius, spacing, typography } from "@/src/theme/tokens";

export default function ReaderScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const slugStr = typeof slug === "string" ? slug : "";

  const query = useQuery({
    queryKey: queryKeys.story(slugStr),
    queryFn: () => fetchStory(slugStr),
    enabled: slugStr.length > 0,
  });

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
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>
            {query.data.author.handle} · {query.data.minutes} min ·{" "}
            {query.data.genre}
          </Text>
          <Text style={styles.title}>{query.data.title}</Text>
          {query.data.synopsis ? (
            <Text style={styles.synopsis}>{query.data.synopsis}</Text>
          ) : null}

          <View style={styles.divider} />

          {query.data.body.map((para, i) => (
            <Text key={i} style={styles.paragraph}>
              {para}
            </Text>
          ))}

          {query.data.tags.length > 0 ? (
            <View style={styles.tagRow}>
              {query.data.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={styles.footerByline}>
            — {query.data.author.name}
          </Text>
        </ScrollView>
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
});
