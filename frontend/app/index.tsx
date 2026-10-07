import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { useTheme } from "@/src/theme";

export default function Index() {
  const { colors } = useTheme();
  const [dest, setDest] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const seen = await AsyncStorage.getItem("memoraq.onboarded");
      setDest(seen ? "/(tabs)/customers" : "/onboarding");
    })();
  }, []);
  if (!dest)
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  return <Redirect href={dest as any} />;
}
