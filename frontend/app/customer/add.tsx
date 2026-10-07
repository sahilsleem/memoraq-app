import FeatherIcon from "@react-native-vector-icons/feather";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Toast } from "@/src/components/ui";
import { runImport } from "@/src/importer/import-pipeline";
import { makeStyles, radius, spacing, type, useTheme } from "@/src/theme";

type Status =
  | { kind: "idle" }
  | { kind: "importing"; label: string }
  | { kind: "done"; customerId: string; messages: number; attachments: number; duplicate: boolean }
  | { kind: "error"; reason: string };

export default function AddCustomer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pasted, setPasted] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const importFile = async () => {
    setStatus({ kind: "importing", label: "Choosing file…" });
    const res = await DocumentPicker.getDocumentAsync({
      type: ["text/plain", "application/zip", "application/x-zip-compressed", "*/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.[0]) {
      setStatus({ kind: "idle" });
      return;
    }
    const file = res.assets[0];
    const name = file.name?.toLowerCase() ?? "";
    const mime = (file.mimeType ?? "").toLowerCase();
    const isZip = name.endsWith(".zip") || mime.includes("zip");
    setStatus({ kind: "importing", label: isZip ? "Reading archive…" : "Reading transcript…" });
    const r = await runImport(
      isZip
        ? { kind: "zip", uri: file.uri, filename: file.name }
        : { kind: "txt", uri: file.uri, filename: file.name },
    );
    handleResult(r);
  };

  const importPasted = async () => {
    if (!pasted.trim()) return;
    setStatus({ kind: "importing", label: "Parsing transcript…" });
    const r = await runImport({ kind: "text", raw: pasted });
    handleResult(r);
  };

  function handleResult(r: Awaited<ReturnType<typeof runImport>>) {
    if (r.status === "ok") {
      setStatus({
        kind: "done",
        customerId: r.customerId,
        messages: r.messageCount,
        attachments: r.attachmentCount,
        duplicate: r.isDuplicate,
      });
    } else if (r.status === "empty") {
      setStatus({ kind: "error", reason: "The file contained no readable messages." });
    } else if (r.status === "invalid") {
      setStatus({ kind: "error", reason: r.reason });
    } else {
      const human = r.reason === "DB_UNAVAILABLE"
        ? "Database is not available in this web preview. Install Memoraq on an Android device to import real customers."
        : r.reason;
      setStatus({ kind: "error", reason: human });
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="add-customer-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="add-back">
            <FeatherIcon name="arrow-left" size={20} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Add customer</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160, gap: spacing.lg }}>
          <View style={styles.explainer}>
            <Text style={styles.explainerTitle}>From WhatsApp</Text>
            <Text style={styles.explainerBody}>
              Open the chat in WhatsApp → tap the contact name → <Text style={{ fontWeight: "500" }}>Export chat</Text> →
              choose Memoraq (native share) or save to your device and import it below.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Import a .txt or .zip file</Text>
            <Text style={styles.cardBody}>Memoraq copies the transcript (and any media in the zip) into private app storage.</Text>
            <View style={{ height: spacing.md }} />
            <Button
              label="Choose file"
              onPress={importFile}
              testID="pick-file-button"
              iconLeft={<FeatherIcon name="file-plus" size={16} color={colors.onBrandPrimary} />}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Paste transcript text</Text>
            <Text style={styles.cardBody}>Useful for quick tests or if you already have the text copied.</Text>
            <TextInput
              value={pasted}
              onChangeText={setPasted}
              placeholder={"12/08/23, 10:30 AM - Rahul: Hi\n12/08/23, 10:31 AM - You: Hello"}
              placeholderTextColor={colors.muted}
              style={styles.textarea}
              multiline
              testID="paste-transcript-input"
            />
            <Button label="Import pasted text" variant="secondary" onPress={importPasted} testID="import-pasted-button" />
          </View>

          {status.kind === "importing" ? (
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>{status.label}</Text>
              <Text style={styles.statusBody}>This stays on your device.</Text>
            </View>
          ) : null}
          {status.kind === "done" ? (
            <View style={[styles.statusCard, { backgroundColor: colors.brandTertiary }]}>
              <Text style={[styles.statusTitle, { color: colors.onBrandTertiary }]}>
                {status.duplicate ? "Re-imported successfully" : "Customer added"}
              </Text>
              <Text style={[styles.statusBody, { color: colors.onBrandTertiary }]}>
                {status.messages} messages · {status.attachments} attachments
              </Text>
              <View style={{ height: spacing.md }} />
              <Button
                label="Open customer"
                onPress={() => router.replace(`/customer/${status.customerId}`)}
                testID="open-imported-customer"
              />
            </View>
          ) : null}
          {status.kind === "error" ? (
            <View style={[styles.statusCard, { backgroundColor: colors.error + "22" }]}>
              <Text style={[styles.statusTitle, { color: colors.error }]}>Import failed</Text>
              <Text style={[styles.statusBody, { color: colors.error }]}>{status.reason}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  title: { ...type.title, color: c.onSurface, fontSize: 20 },
  explainer: {
    backgroundColor: c.brandTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: 4,
  },
  explainerTitle: { ...type.bodyStrong, color: c.onBrandTertiary, fontSize: 14 },
  explainerBody: { ...type.body, color: c.onBrandTertiary, opacity: 0.9, fontSize: 13 },
  card: { backgroundColor: c.surfaceSecondary, padding: spacing.lg, borderRadius: radius.md, gap: 6 },
  cardTitle: { ...type.bodyStrong, color: c.onSurfaceSecondary, fontSize: 15 },
  cardBody: { ...type.body, color: c.muted, fontSize: 13 },
  textarea: {
    backgroundColor: c.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    minHeight: 120,
    color: c.onSurface,
    fontSize: 13,
    textAlignVertical: "top",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusCard: { backgroundColor: c.surfaceSecondary, padding: spacing.lg, borderRadius: radius.md, gap: 2 },
  statusTitle: { ...type.bodyStrong, color: c.onSurfaceSecondary, fontSize: 15 },
  statusBody: { ...type.body, color: c.muted, fontSize: 13 },
}));
