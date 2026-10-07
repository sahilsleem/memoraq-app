import FeatherIcon from "@react-native-vector-icons/feather";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip, EmptyState } from "@/src/components/ui";
import { completeFollowUp, getCustomer, listFollowUps } from "@/src/db/repo";
import type { Customer, FollowUp } from "@/src/db/types";
import { makeStyles, radius, spacing, type, useTheme } from "@/src/theme";

type Bucket = "today" | "upcoming" | "overdue" | "completed";
const BUCKETS: { key: Bucket; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "overdue", label: "Overdue" },
  { key: "completed", label: "Completed" },
];

export default function FollowupsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const [bucket, setBucket] = useState<Bucket>("today");
  const [items, setItems] = useState<{ f: FollowUp; c: Customer | null }[] | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await listFollowUps(bucket);
      const out: { f: FollowUp; c: Customer | null }[] = [];
      for (const f of list) {
        const c = await getCustomer(f.customer_id);
        out.push({ f, c });
      }
      setItems(out);
    } catch {
      setItems([]);
    }
  }, [bucket]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="followups-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Follow Ups</Text>
        <Text style={styles.subtitle}>Local reminders. Never leaves this device.</Text>
      </View>
      <View style={styles.chipRowWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {BUCKETS.map((b) => (
            <Chip
              key={b.key}
              label={b.label}
              active={bucket === b.key}
              onPress={() => setBucket(b.key)}
              testID={`fu-bucket-${b.key}`}
            />
          ))}
        </ScrollView>
      </View>
      {items === null ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.muted }}>Loading…</Text>
        </View>
      ) : items.length === 0 ? (
        <EmptyState title="Nothing scheduled" subtitle="Set reminders from a customer's detail screen." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.f.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160, gap: spacing.sm }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable
                testID={`fu-open-${item.f.id}`}
                style={{ flex: 1 }}
                onPress={() => item.c && router.push(`/customer/${item.c.id}`)}
              >
                <Text style={styles.title2} numberOfLines={1}>
                  {item.f.title}
                </Text>
                <Text style={styles.meta}>
                  {new Date(item.f.scheduled_at).toLocaleString()} · {item.c?.custom_name || item.c?.display_name || "Customer"}
                </Text>
                {item.f.note ? (
                  <Text style={styles.note} numberOfLines={2}>
                    {item.f.note}
                  </Text>
                ) : null}
              </Pressable>
              {!item.f.completed ? (
                <Pressable
                  testID={`fu-complete-${item.f.id}`}
                  onPress={async () => {
                    await completeFollowUp(item.f.id);
                    load();
                  }}
                  style={styles.doneBtn}
                >
                  <FeatherIcon name="check" size={18} color={colors.onBrandPrimary} />
                </Pressable>
              ) : (
                <View style={[styles.doneBtn, { backgroundColor: colors.surfaceTertiary }]}>
                  <FeatherIcon name="check" size={18} color={colors.muted} />
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { ...type.display, color: c.onSurface, fontSize: 28 },
  subtitle: { ...type.body, color: c.muted, marginTop: 2 },
  chipRowWrap: { height: 56, justifyContent: "center" },
  chipRow: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: c.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  title2: { ...type.bodyStrong, color: c.onSurfaceSecondary, fontSize: 15 },
  meta: { ...type.caption, color: c.muted, marginTop: 2 },
  note: { ...type.caption, color: c.onSurfaceTertiary, marginTop: 4 },
  doneBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
}));
