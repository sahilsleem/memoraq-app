import FeatherIcon from "@react-native-vector-icons/feather";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Chip } from "@/src/components/ui";
import { addFollowUp } from "@/src/db/repo";
import { notificationScheduler } from "@/src/platform/notifications";
import { makeStyles, radius, spacing, type, useTheme } from "@/src/theme";

const QUICK: { label: string; days: number }[] = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
  { label: "In 2 weeks", days: 14 },
];

export default function FollowUpScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const [title, setTitle] = useState("Follow up");
  const [note, setNote] = useState("");
  const [days, setDays] = useState<number>(1);

  const onSchedule = async () => {
    const scheduledAt = Date.now() + days * 24 * 60 * 60 * 1000;
    const granted = await notificationScheduler.requestPermissions();
    let notifId: string | null = null;
    if (granted) {
      notifId = await notificationScheduler.schedule({
        title: `Memoraq · ${title}`,
        body: note || "You scheduled a follow-up for this customer",
        dateMs: scheduledAt,
        data: { customerId: String(id) },
      });
    }
    await addFollowUp({
      customer_id: String(id),
      title,
      note: note || null,
      scheduled_at: scheduledAt,
      notification_id: notifId,
    });
    router.back();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="followup-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="fu-back">
            <FeatherIcon name="arrow-left" size={20} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Schedule follow-up</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.label}>When</Text>
          <View style={styles.chipRow}>
            {QUICK.map((q) => (
              <Chip
                key={q.label}
                label={q.label}
                active={days === q.days}
                onPress={() => setDays(q.days)}
                testID={`fu-quick-${q.days}`}
              />
            ))}
          </View>
          <Text style={styles.hint}>
            Reminder fires on {new Date(Date.now() + days * 86400000).toLocaleString()}
          </Text>

          <View style={{ height: spacing.lg }} />
          <Text style={styles.label}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            placeholderTextColor={colors.muted}
            testID="fu-title-input"
          />
          <View style={{ height: spacing.md }} />
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
            multiline
            placeholder="What should Memoraq remind you about?"
            placeholderTextColor={colors.muted}
            testID="fu-note-input"
          />
          <View style={{ height: spacing.xl }} />
          <Button label="Set Follow-up" fullWidth onPress={onSchedule} testID="fu-save-button" />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  title: { ...type.title, color: c.onSurface, fontSize: 20 },
  body: { padding: spacing.lg },
  label: { ...type.caption, color: c.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  hint: { ...type.caption, color: c.muted, marginTop: spacing.sm },
  input: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: c.onSurfaceSecondary,
    fontSize: 15,
  },
}));
