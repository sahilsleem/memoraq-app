import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/src/components/ui";
import { makeStyles, spacing, type } from "@/src/theme";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    title: "Your customers are in your chats.",
    body: "Memoraq turns exported WhatsApp conversations into a private, searchable archive you fully control.",
  },
  {
    title: "Private by design.",
    body: "No account. No cloud upload. No WhatsApp login. No internet required. Your data stays on this device.",
  },
  {
    title: "Add a customer in seconds.",
    body: "Open WhatsApp → Export Chat → Share with Memoraq. Or import a .txt or .zip file manually.",
  },
  {
    title: "Keep customer memory organized.",
    body: "Rename customers, add private notes, apply tags, schedule follow-ups and search everything offline.",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const [i, setI] = useState(0);

  const finish = async () => {
    await AsyncStorage.setItem("memoraq.onboarded", "1");
    router.replace("/(tabs)/customers");
  };

  const next = async () => {
    if (i < SLIDES.length - 1) setI(i + 1);
    else await finish();
  };

  const slide = SLIDES[i];

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]} testID="onboarding-screen">
      <View style={styles.topBar}>
        <Text style={styles.wordmark}>Memoraq</Text>
        <Pressable onPress={finish} testID="onboarding-skip-button">
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
          </View>
          <Text style={styles.step}>Step {i + 1} of {SLIDES.length}</Text>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, k) => (
            <View key={k} style={[styles.dot, k === i && styles.dotActive]} />
          ))}
        </View>
        <Button
          label={i === SLIDES.length - 1 ? "Add Your First Customer" : "Continue"}
          onPress={next}
          fullWidth
          testID="onboarding-next-button"
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface, paddingHorizontal: spacing.xl },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  wordmark: { ...type.title, color: c.onSurface, letterSpacing: 0.3 },
  skip: { ...type.body, color: c.muted, padding: spacing.sm },
  hero: { flex: 1, justifyContent: "center", gap: spacing.md },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: c.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  badgeDot: { width: 20, height: 20, borderRadius: 6, backgroundColor: c.brandPrimary },
  step: { ...type.caption, color: c.muted, letterSpacing: 1, textTransform: "uppercase" },
  title: { ...type.display, color: c.onSurface, fontSize: 30, lineHeight: 38, marginTop: spacing.sm, maxWidth: width - 48 },
  body: { ...type.body, color: c.muted, fontSize: 16, lineHeight: 24, maxWidth: width - 48 },
  footer: { gap: spacing.lg },
  dots: { flexDirection: "row", gap: 6, justifyContent: "center" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.border },
  dotActive: { backgroundColor: c.brandPrimary, width: 18 },
}));
