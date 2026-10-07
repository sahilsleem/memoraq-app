import FeatherIcon from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/ui";
import { globalSearch, type SearchHit } from "@/src/db/repo";
import { makeStyles, radius, spacing, type, useTheme } from "@/src/theme";

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);

  useEffect(() => {
    let active = true;
    const h = setTimeout(async () => {
      if (!q.trim()) {
        setHits(null);
        return;
      }
      try {
        const r = await globalSearch(q.trim());
        if (active) setHits(r);
      } catch {
        if (active) setHits([]);
      }
    }, 180);
    return () => {
      active = false;
      clearTimeout(h);
    };
  }, [q]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="search-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>
      <View style={styles.inputWrap}>
        <FeatherIcon name="search" size={18} color={colors.muted} />
        <TextInput
          testID="search-input"
          value={q}
          onChangeText={setQ}
          placeholder="Search names, messages, notes…"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {q ? (
          <Pressable onPress={() => setQ("")} testID="search-clear">
            <FeatherIcon name="x" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {hits === null ? (
        <EmptyState title="Search anything, offline." subtitle="Find customers, archived messages and your private notes." />
      ) : hits.length === 0 ? (
        <EmptyState title="No results" subtitle={`Nothing matched "${q}".`} />
      ) : (
        <FlatList
          data={hits}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160, gap: spacing.sm }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/customer/${item.customer_id}`)}
              style={styles.hit}
              testID={`search-hit-${item.kind}`}
            >
              <View style={styles.kindPill}>
                <Text style={styles.kindText}>{item.kind}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.customer_name}
                </Text>
                <Text style={styles.snippet} numberOfLines={2}>
                  {item.snippet}
                </Text>
              </View>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { ...type.display, color: c.onSurface, fontSize: 28 },
  inputWrap: {
    marginHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: c.surfaceSecondary,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    height: 48,
  },
  input: { flex: 1, color: c.onSurface, fontSize: 15 },
  hit: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: c.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: "flex-start",
  },
  kindPill: { backgroundColor: c.brandTertiary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  kindText: { ...type.caption, color: c.onBrandTertiary, textTransform: "uppercase", fontSize: 10, fontWeight: "500" },
  name: { ...type.bodyStrong, color: c.onSurfaceSecondary, fontSize: 14 },
  snippet: { ...type.caption, color: c.muted, marginTop: 2 },
}));
