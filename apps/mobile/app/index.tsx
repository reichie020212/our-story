import { GenreSchema, type Genre } from "@our-story/api-types";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, View } from "react-native";

// Pull the genre list straight from the shared schema so the UI's
// source of truth is identical to the server's. Adding a new genre
// in prisma/schema.prisma + packages/api-types means it shows up here
// automatically — no separate mobile-side enum to keep in sync.
const GENRES: Genre[] = GenreSchema.options;

export default function Index() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>OurStory</Text>
        <Text style={styles.title}>A quiet library</Text>
        <Text style={styles.body}>
          Mobile companion to the web reader. The login + browse + reader
          screens land in upcoming commits — this screen exists to prove
          the workspace plumbing works.
        </Text>
        <View style={styles.divider} />
        <Text style={styles.label}>Genres (from @our-story/api-types):</Text>
        {GENRES.map((g) => (
          <Text key={g} style={styles.genre}>
            • {g}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafaf7" },
  container: { padding: 24, gap: 8 },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#8a8a82",
  },
  title: { fontSize: 28, fontWeight: "600", color: "#1a1a1a" },
  body: { fontSize: 15, lineHeight: 22, color: "#3a3a3a", marginTop: 12 },
  divider: { height: 1, backgroundColor: "#e6e3da", marginVertical: 24 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  genre: { fontSize: 15, color: "#3a3a3a", lineHeight: 24 },
});
