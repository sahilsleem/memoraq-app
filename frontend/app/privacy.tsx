import FeatherIcon from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { makeStyles, radius, spacing, type, useTheme } from "@/src/theme";

const BULLETS = [
  { icon: "shield", title: "Data stays on this device", body: "Memoraq uses only local storage. There is no cloud database." },
  { icon: "cloud-off", title: "No account, no WhatsApp login", body: "You never sign in. Memoraq cannot access your WhatsApp account." },
  { icon: "slash", title: "No advertising, no analytics", body: "No tracking SDKs. No third-party identifiers." },
  { icon: "wifi-off", title: "Offline by default", body: "Core features work without an internet connection." },
  { icon: "download", title: "You own your export", body: "The Rescue Pack is a portable ZIP you control." },
];

export default function Privacy() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="privacy-screen">
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="privacy-back">
          <FeatherIcon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Privacy</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 120 }}>
        <Text style={styles.lead}>Your WhatsApp account is not a business database.</Text>
        <Text style={styles.leadSub}>Memoraq is designed to protect the customer history your business depends on, without changing anything about WhatsApp.</Text>
        {BULLETS.map((b) => (
          <View key={b.title} style={styles.row}>
            <View style={styles.iconWrap}>
              <FeatherIcon name={b.icon as any} size={16} color={colors.onBrandTertiary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{b.title}</Text>
              <Text style={styles.rowBody}>{b.body}</Text>
            </View>
          </View>
        ))}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Support</Text>
          <Text style={styles.cardBody}>isahsileem@gmail.com</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  title: { ...type.title, color: c.onSurface, fontSize: 20 },
  lead: { ...type.display, color: c.onSurface, fontSize: 24, lineHeight: 30 },
  leadSub: { ...type.body, color: c.muted, marginBottom: spacing.md },
  row: { flexDirection: "row", gap: spacing.md, backgroundColor: c.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, alignItems: "flex-start" },
  iconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  rowTitle: { ...type.bodyStrong, color: c.onSurfaceSecondary, fontSize: 14 },
  rowBody: { ...type.body, color: c.muted, fontSize: 13, marginTop: 2 },
  card: { backgroundColor: c.brandTertiary, padding: spacing.md, borderRadius: radius.md },
  cardTitle: { ...type.caption, color: c.onBrandTertiary, letterSpacing: 1, textTransform: "uppercase" },
  cardBody: { ...type.body, color: c.onBrandTertiary, marginTop: 2 },
}));
