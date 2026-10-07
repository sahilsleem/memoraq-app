import FeatherIcon from "@react-native-vector-icons/feather";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/src/components/ui";
import { getCustomer, updateCustomerName } from "@/src/db/repo";
import { makeStyles, radius, spacing, type, useTheme } from "@/src/theme";

export default function EditCustomer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [identity, setIdentity] = useState("");

  useEffect(() => {
    (async () => {
      const c = await getCustomer(String(id));
      if (!c) return;
      setName(c.custom_name ?? "");
      setIdentity(c.original_identity);
    })();
  }, [id]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="edit-customer-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="edit-back">
            <FeatherIcon name="arrow-left" size={20} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Edit customer</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor={colors.muted}
            testID="edit-name-input"
          />
          <Text style={styles.hint}>The underlying WhatsApp identity ({identity}) is preserved and never changes.</Text>
          <View style={{ height: spacing.lg }} />
          <Button
            label="Save"
            fullWidth
            onPress={async () => {
              await updateCustomerName(String(id), name.trim() || null);
              router.back();
            }}
            testID="edit-save-button"
          />
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
  input: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: c.onSurfaceSecondary,
    fontSize: 15,
  },
  hint: { ...type.caption, color: c.muted, marginTop: spacing.sm },
}));
