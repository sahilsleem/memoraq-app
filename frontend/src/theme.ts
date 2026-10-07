// Memoraq design tokens (light + dark). Sourced from /app/design_guidelines.json.
import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FAFAFA",
  onSurface: "#161B18",
  surfaceSecondary: "#F2F4F2",
  onSurfaceSecondary: "#161B18",
  surfaceTertiary: "#E9ECE9",
  onSurfaceTertiary: "#161B18",
  surfaceInverse: "#121413",
  onSurfaceInverse: "#FAFAFA",
  muted: "#546358",
  brand: "#365341",
  onBrand: "#FFFFFF",
  brandPrimary: "#365341",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#4F7359",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#CDE0D2",
  onBrandTertiary: "#1A2F22",
  success: "#3A664A",
  onSuccess: "#FFFFFF",
  warning: "#856404",
  onWarning: "#FFFFFF",
  error: "#8B2E2E",
  onError: "#FFFFFF",
  info: "#4A5A52",
  onInfo: "#FFFFFF",
  border: "#E1E5E2",
  borderStrong: "#B8C2BC",
  divider: "#E1E5E2",
};

const dark: typeof light = {
  surface: "#121413",
  onSurface: "#E3E8E4",
  surfaceSecondary: "#1D221E",
  onSurfaceSecondary: "#E3E8E4",
  surfaceTertiary: "#2A312B",
  onSurfaceTertiary: "#E3E8E4",
  surfaceInverse: "#FAFAFA",
  onSurfaceInverse: "#121413",
  muted: "#93A197",
  brand: "#A3C6AF",
  onBrand: "#0F1C14",
  brandPrimary: "#A3C6AF",
  onBrandPrimary: "#0F1C14",
  brandSecondary: "#82AA90",
  onBrandSecondary: "#0F1C14",
  brandTertiary: "#294232",
  onBrandTertiary: "#C5DFCD",
  success: "#5C9970",
  onSuccess: "#0F1C14",
  warning: "#D6A324",
  onWarning: "#0F1C14",
  error: "#D16060",
  onError: "#0F1C14",
  info: "#8B9E93",
  onInfo: "#0F1C14",
  border: "#313B34",
  borderStrong: "#4A5A52",
  divider: "#313B34",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light, dark };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };
export const type = {
  display: { fontSize: 24, fontWeight: "500" as const },
  title: { fontSize: 20, fontWeight: "500" as const },
  body: { fontSize: 14, fontWeight: "400" as const },
  bodyStrong: { fontSize: 14, fontWeight: "500" as const },
  caption: { fontSize: 12, fontWeight: "400" as const },
  large: { fontSize: 16, fontWeight: "500" as const },
};

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}
setColorScheme?.(null);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const colors = light;
