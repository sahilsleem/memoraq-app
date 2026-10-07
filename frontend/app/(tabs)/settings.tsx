import FeatherIcon from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Toast } from "@/src/components/ui";
import { deleteEverything, listCustomers } from "@/src/db/repo";
import { getEntitlement, type EntitlementState } from "@/src/platform/billing";
import { createRescuePack, shareRescuePack } from "@/src/platform/rescue-pack";
import { loadSampleData } from "@/src/platform/sample-data";
import { makeStyles, radius, spacing, type, useTheme } from "@/src/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const [ent, setEnt] = useState<EntitlementState>("FREE");
  const [count, setCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setEnt(await getEntitlement());
      const cs = await listCustomers();
      setCount(cs.length);
    } catch {
      setCount(0);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onExport = async () => {
    try {
      const pack = await createRescuePack();
      await shareRescuePack(pack.uri);
      setToast(`Rescue Pack ready · ${pack.customerCount} customers`);
    } catch {
      setToast("Export failed. Please try again.");
    }
  };

  const onDeleteAll = () => {
    Alert.alert(
      "Delete everything?",
      "This permanently removes all Memoraq-managed customers, messages, notes, tags, follow-ups and attachments on this device. Rescue Packs you have already saved are not affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEverything();
              setToast("All Memoraq data deleted");
            } catch {
              setToast("Delete failed. Please try again.");
            }
            refresh();
          },
        },
      ],
    );
  };

  const onLoadSample = async () => {
    try {
      const n = await loadSampleData();
      setToast(n > 0 ? `Loaded ${n} sample customers` : "Sample data already present or app not empty");
    } catch {
      setToast("Database unavailable in this preview. Install the app on a device to try sample data.");
    }
    refresh();
  };

  const pro = ent === "PRO_CONFIRMED" || ent === "PRO_CACHED";

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="settings-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160, gap: spacing.lg }}>
        <Pressable testID="pro-card" onPress={() => router.push("/pro")} style={styles.proCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.proKicker}>MEMORAQ PRO</Text>
            <Text style={styles.proTitle}>{pro ? "You're on Pro" : "Protect your entire customer history"}</Text>
            <Text style={styles.proSub}>
              {pro ? "Unlimited customers and Rescue Packs." : "Unlimited customers, unlimited Rescue Packs."}
            </Text>
          </View>
          <FeatherIcon name="chevron-right" size={20} color={colors.onBrandPrimary} />
        </Pressable>

        <Section title="Data">
          <Row testID="create-rescue-pack" icon="download" label="Create Rescue Pack" onPress={onExport} subtitle="Portable offline archive (ZIP)" />
          <Row testID="add-customer-settings" icon="plus" label="Import Customer" onPress={() => router.push("/customer/add")} />
          <Row testID="delete-everything" icon="trash-2" label="Delete Everything" danger onPress={onDeleteAll} subtitle="Danger zone" />
        </Section>

        <Section title="App">
          <Row testID="privacy-row" icon="shield" label="Privacy" subtitle="How Memoraq protects your data" onPress={() => router.push("/privacy")} />
          <Row testID="about-row" icon="info" label="About Memoraq" onPress={() => router.push("/about")} />
          <Row testID="contact-row" icon="mail" label="Contact Support" subtitle="isahsileem@gmail.com" />
        </Section>

        <Section title="Developer">
          <Row testID="load-sample-data" icon="database" label="Load Sample Data" subtitle={count > 0 ? `${count} customers already present` : "Create 4 realistic demo customers"} onPress={onLoadSample} />
        </Section>

        <Text style={styles.footer}>Memoraq · Private customer memory · v1.0</Text>
      </ScrollView>
      {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBox}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  subtitle,
  onPress,
  danger,
  testID,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} style={styles.row} testID={testID}>
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: danger ? colors.error + "22" : colors.brandTertiary },
        ]}
      >
        <FeatherIcon name={icon as any} size={16} color={danger ? colors.error : colors.onBrandTertiary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, danger && { color: colors.error }]}>{label}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      <FeatherIcon name="chevron-right" size={18} color={colors.muted} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { ...type.display, color: c.onSurface, fontSize: 28 },
  proCard: {
    backgroundColor: c.brandPrimary,
    padding: spacing.lg,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  proKicker: { ...type.caption, color: c.onBrandPrimary, opacity: 0.75, letterSpacing: 1, fontWeight: "500" },
  proTitle: { ...type.title, color: c.onBrandPrimary, marginTop: 4, fontSize: 18 },
  proSub: { ...type.body, color: c.onBrandPrimary, opacity: 0.85, marginTop: 2, fontSize: 13 },
  sectionTitle: {
    ...type.caption,
    color: c.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  sectionBox: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { ...type.bodyStrong, color: c.onSurfaceSecondary, fontSize: 15 },
  rowSub: { ...type.caption, color: c.muted, marginTop: 2 },
  footer: { ...type.caption, color: c.muted, textAlign: "center", marginTop: spacing.xl },
}));
