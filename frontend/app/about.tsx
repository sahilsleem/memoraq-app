import FeatherIcon from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { makeStyles, spacing, type, useTheme } from "@/src/theme";

export default function About() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="about-screen">
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="about-back">
          <FeatherIcon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>About Memoraq</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={styles.body}>
          Memoraq is a private customer memory and archive for small businesses and independent professionals.
        </Text>
        <Text style={styles.body}>
          It turns exported WhatsApp conversations into a searchable local archive with notes, tags, follow-ups and a
          portable Rescue Pack.
        </Text>
        <Text style={styles.body}>
          Memoraq is not a WhatsApp replacement, a cloud backup or a full CRM. It is private customer memory, nothing
          more.
        </Text>
        <Text style={styles.footer}>Version 1.0 · com.blackbox</Text>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  title: { ...type.title, color: c.onSurface, fontSize: 20 },
  body: { ...type.body, color: c.onSurface, fontSize: 15, lineHeight: 22 },
  footer: { ...type.caption, color: c.muted, marginTop: spacing.xl },
}));
