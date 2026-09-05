import { Stack } from "expo-router";
import { COLORS } from "../../lib/constants";

export default function StackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.dark },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: COLORS.dark },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="markets" options={{ title: "Marches" }} />
      <Stack.Screen name="alerts" options={{ title: "Alertes" }} />
      <Stack.Screen name="settings" options={{ title: "Parametres" }} />
      <Stack.Screen name="help" options={{ title: "Aide" }} />
      <Stack.Screen name="help/faq" options={{ title: "FAQ" }} />
      <Stack.Screen name="paper" options={{ title: "Simulation" }} />
    </Stack>
  );
}
