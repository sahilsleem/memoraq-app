import FeatherIcon from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Toast } from "@/src/components/ui";
import { getEntitlement, setEntitlement, type EntitlementState } from "@/src/platform/billing";
import { makeStyles, radius, spacing, type, useTheme } from "@/src/theme";

const BENEFITS = [
  { icon: "users", title: "Unlimited customers", body: "Protect every conversation your business depends on." },
  { icon: "download", title: "Unlimited Rescue Packs", body: "Export your archive as often as you need." },
  { icon: "shield", title: "Full customer memory", body: "No limits on notes, tags or follow-ups." },
  { icon: "lock", title: "Private and local", body: "Your data never leaves this device." },
];

export default function Pro() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const [ent, setEntState] = useState<EntitlementState>("FREE");
  const [toast, setToast] = useState<string | null>(null);

  const refresh = async () => setEntState(await getEntitlement());
  useEffect(() => {
    refresh();
  }, []);

  const pro = ent === "PRO_CONFIRMED" || ent === "PRO_CACHED";

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="pro-screen">
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="pro-back">
          <FeatherIcon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160 }}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>MEMORAQ PRO</Text>
          <Text style={styles.title}>Protect your entire customer history.</Text>
          <Text style={styles.sub}>One-time purchase. No subscription. No account.</Text>
        </View>
        <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <FeatherIcon name={b.icon as any} size={18} color={colors.onBrandTertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitBody}>{b.body}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: spacing.xl }} />
        {pro ? (
          <View style={styles.proBadge}>
            <FeatherIcon name="check-circle" size={18} color={colors.onBrandPrimary} />
            <Text style={styles.proBadgeText}>You are on Memoraq Pro.</Text>
          </View>
        ) : (
          <>
            <Button
              label="Unlock Memoraq Pro"
              fullWidth
              testID="pro-unlock-button"
              onPress={async () => {
                // Mock purchase. Real billing is wired by native port (pro_lifetime_unlock).
                await setEntitlement("PRO_CONFIRMED");
                setToast("Welcome to Memoraq Pro");
                refresh();
              }}
            />
            <View style={{ height: spacing.md }} />
            <Button
              label="Restore purchase"
              variant="ghost"
              fullWidth
              testID="pro-restore-button"
              onPress={() => setToast("No purchases found on this device")}
            />
          </>
        )}
        <Text style={styles.disclaimer}>
          Billing on this build is a local mock. The real one-time purchase (product id pro_lifetime_unlock) is wired through
          Google Play Billing in the native Android port.
        </Text>
      </ScrollView>
      {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  topBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  hero: { gap: spacing.sm, paddingTop: spacing.lg },
  kicker: { ...type.caption, color: c.muted, letterSpacing: 2, fontWeight: "500" },
  title: { ...type.display, color: c.onSurface, fontSize: 28, lineHeight: 34 },
  sub: { ...type.body, color: c.muted, fontSize: 15 },
  benefit: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, backgroundColor: c.surfaceSecondary, padding: spacing.md, borderRadius: radius.md },
  benefitIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  benefitTitle: { ...type.bodyStrong, color: c.onSurfaceSecondary, fontSize: 15 },
  benefitBody: { ...type.body, color: c.muted, fontSize: 13, marginTop: 2 },
  proBadge: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.brandPrimary, padding: spacing.md, borderRadius: radius.md },
  proBadgeText: { ...type.bodyStrong, color: c.onBrandPrimary },
  disclaimer: { ...type.caption, color: c.muted, marginTop: spacing.xl, textAlign: "center" },
}));
