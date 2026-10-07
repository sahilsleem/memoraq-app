import FeatherIcon from "@react-native-vector-icons/feather";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, Chip, EmptyState, Button } from "@/src/components/ui";
import { listCustomers, listCustomerTags, nextFollowUpFor } from "@/src/db/repo";
import type { Customer, FollowUp, Tag } from "@/src/db/types";
import { makeStyles, radius, spacing, type, useTheme } from "@/src/theme";

type Row = { customer: Customer; tags: Tag[]; nextFollowUp: FollowUp | null };

const FILTERS: { key: "all" | "starred" | "followups"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "starred", label: "Starred" },
  { key: "followups", label: "Follow-ups" },
];

function timeAgo(ms: number | null): string {
  if (!ms) return "No activity yet";
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ms).toLocaleDateString();
}

export default function CustomersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const [filter, setFilter] = useState<"all" | "starred" | "followups">("all");
  const [rows, setRows] = useState<Row[] | null>(null);
  const tabBarHeight = Platform.OS === "web" ? 64 : 49 + insets.bottom;

  const load = useCallback(async () => {
    try {
      const cs = await listCustomers(filter);
      const out: Row[] = [];
      for (const c of cs) {
        const [tags, fu] = await Promise.all([listCustomerTags(c.id), nextFollowUpFor(c.id)]);
        out.push({ customer: c, tags, nextFollowUp: fu });
      }
      setRows(out);
    } catch {
      setRows([]);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const total = rows?.length ?? 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="customers-screen">
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Customers</Text>
          <Text style={styles.subtitle}>{total === 0 ? "Private customer archive" : `${total} customers protected`}</Text>
        </View>
        <Pressable
          testID="header-settings-button"
          onPress={() => router.push("/(tabs)/settings")}
          style={styles.iconBtn}
        >
          <FeatherIcon name="settings" size={20} color={colors.onSurface} />
        </Pressable>
      </View>

      <View style={styles.chipRowWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              active={filter === f.key}
              onPress={() => setFilter(f.key)}
              testID={`filter-chip-${f.key}`}
            />
          ))}
        </ScrollView>
      </View>

      {rows === null ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.muted }}>Loading…</Text>
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          testID="customers-empty-state"
          title="Your customer memory starts here."
          subtitle="Export a WhatsApp chat and send it to Memoraq, or import a .txt / .zip file manually."
          action={
            <Button
              testID="empty-add-customer-button"
              label="Add Customer"
              onPress={() => router.push("/customer/add")}
            />
          }
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.customer.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 160 }}
          renderItem={({ item }) => <CustomerRow row={item} onPress={() => router.push(`/customer/${item.customer.id}`)} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}

      <Pressable
        testID="add-customer-fab"
        onPress={() => router.push("/customer/add")}
        style={[styles.fab, { bottom: tabBarHeight + 16 }]}
      >
        <FeatherIcon name="plus" size={22} color={colors.onBrandPrimary} />
        <Text style={styles.fabText}>Add Customer</Text>
      </Pressable>
    </View>
  );
}

function CustomerRow({ row, onPress }: { row: Row; onPress: () => void }) {
  const styles = useRowStyles();
  const { colors } = useTheme();
  const name = row.customer.custom_name || row.customer.display_name;
  return (
    <Pressable onPress={onPress} style={styles.card} testID={`customer-row-${row.customer.id}`}>
      <Avatar name={name} size={44} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {row.customer.starred ? <FeatherIcon name="star" size={14} color={colors.warning} /> : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {row.customer.original_identity} · {timeAgo(row.customer.last_message_at)} · {row.customer.message_count} msg
        </Text>
        {row.customer.last_message_preview ? (
          <Text style={styles.preview} numberOfLines={1}>
            {row.customer.last_message_preview}
          </Text>
        ) : null}
        {row.tags.length > 0 ? (
          <View style={styles.tagRow}>
            {row.tags.slice(0, 3).map((t) => (
              <View key={t.id} style={styles.tag}>
                <Text style={styles.tagText}>{t.name}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      {row.nextFollowUp ? (
        <View style={styles.fuPill}>
          <FeatherIcon name="bell" size={12} color={colors.onBrandTertiary} />
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: { ...type.display, color: c.onSurface, fontSize: 28 },
  subtitle: { ...type.body, color: c.muted, marginTop: 2 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRowWrap: { height: 56, justifyContent: "center" },
  chipRow: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  fab: {
    position: "absolute",
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: c.brandPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  fabText: { color: c.onBrandPrimary, fontWeight: "500", fontSize: 14 },
}));

const useRowStyles = makeStyles((c) => ({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: c.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { ...type.large, color: c.onSurfaceSecondary, flexShrink: 1 },
  meta: { ...type.caption, color: c.muted },
  preview: { ...type.caption, color: c.onSurfaceTertiary, marginTop: 2 },
  tagRow: { flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap" },
  tag: { backgroundColor: c.brandTertiary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  tagText: { ...type.caption, color: c.onBrandTertiary, fontSize: 11 },
  fuPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
}));
