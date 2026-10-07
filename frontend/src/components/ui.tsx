import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { makeStyles, radius, spacing, type, useTheme } from "@/src/theme";

type Props = {
  label: string;
  onPress?: () => void | Promise<void>;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  testID?: string;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
};

export function Button({ label, onPress, variant = "primary", disabled, testID, fullWidth, iconLeft }: Props) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const styles = useMemo(() => {
    const bg =
      variant === "primary"
        ? colors.brandPrimary
        : variant === "secondary"
          ? colors.surfaceSecondary
          : variant === "danger"
            ? colors.error
            : "transparent";
    const fg =
      variant === "primary"
        ? colors.onBrandPrimary
        : variant === "danger"
          ? colors.onError
          : colors.onSurface;
    return StyleSheet.create({
      btn: {
        backgroundColor: bg,
        paddingVertical: 14,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.md,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: spacing.sm,
        opacity: disabled || busy ? 0.5 : 1,
        alignSelf: fullWidth ? "stretch" : "flex-start",
        borderWidth: variant === "ghost" ? 1 : 0,
        borderColor: colors.border,
      },
      label: { ...type.bodyStrong, color: fg, fontSize: 15 },
    });
  }, [colors, variant, disabled, busy, fullWidth]);
  return (
    <Pressable
      testID={testID}
      disabled={disabled || busy}
      onPress={async () => {
        if (!onPress) return;
        try {
          setBusy(true);
          await onPress();
        } finally {
          setBusy(false);
        }
      }}
      style={styles.btn}
    >
      {busy ? <ActivityIndicator color={colors.onBrandPrimary} /> : iconLeft}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginVertical: spacing.md }} />;
}

export function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    chip: {
      height: 36,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: active ? colors.brandTertiary : colors.surfaceTertiary,
      borderWidth: 1,
      borderColor: active ? colors.brandSecondary : colors.border,
      flexShrink: 0,
    },
    text: {
      ...type.body,
      color: active ? colors.onBrandTertiary : colors.onSurfaceTertiary,
      fontWeight: "500",
    },
  });
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.chip}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({
  title,
  subtitle,
  action,
  testID,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  testID?: string;
}) {
  const styles = useES();
  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}
const useES = makeStyles((c) => ({
  wrap: { padding: spacing.xl, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  title: { ...type.title, color: c.onSurface, textAlign: "center" },
  sub: { ...type.body, color: c.muted, textAlign: "center", maxWidth: 320 },
}));

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  const initials = useMemo(() => {
    const parts = (name || "?").trim().split(/\s+/);
    const a = parts[0]?.[0] ?? "?";
    const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).toUpperCase();
  }, [name]);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.brandTertiary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: colors.onBrandTertiary, fontWeight: "500", fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export function Toast({ text, onDone }: { text: string; onDone?: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 2600);
    return () => clearTimeout(t);
  }, [onDone]);
  const styles = useT();
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={styles.pill}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}
const useT = makeStyles((c) => ({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 80,
    alignItems: "center",
    zIndex: 999,
  },
  pill: {
    backgroundColor: c.surfaceInverse,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    maxWidth: "88%",
  },
  text: { ...type.body, color: c.onSurfaceInverse },
}));
