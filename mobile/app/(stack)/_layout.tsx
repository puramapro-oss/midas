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
      <Stack.Screen name="analysis/[pair]" options={{ title: "Analyse" }} />
      <Stack.Screen name="alerts" options={{ title: "Alertes" }} />
      <Stack.Screen name="settings" options={{ title: "Parametres" }} />
      <Stack.Screen
        name="settings/exchanges"
        options={{ title: "Exchanges" }}
      />
      <Stack.Screen name="achievements" options={{ title: "Achievements" }} />
      <Stack.Screen name="boutique" options={{ title: "Boutique" }} />
      <Stack.Screen name="lottery" options={{ title: "Tirage mensuel" }} />
      <Stack.Screen name="community" options={{ title: "Communaute" }} />
      <Stack.Screen name="help" options={{ title: "Aide" }} />
      <Stack.Screen name="help/faq" options={{ title: "FAQ" }} />
      <Stack.Screen
        name="help/connect-binance"
        options={{ title: "Connecter Binance" }}
      />
      <Stack.Screen name="partenaire" options={{ title: "Partenaire" }} />
      <Stack.Screen
        name="partenaire/commissions"
        options={{ title: "Commissions" }}
      />
      <Stack.Screen
        name="partenaire/outils"
        options={{ title: "Outils" }}
      />
      <Stack.Screen name="earn" options={{ title: "Gagner" }} />
      <Stack.Screen name="paper" options={{ title: "Paper Trading" }} />
      <Stack.Screen name="bots" options={{ title: "Bots" }} />
      <Stack.Screen name="bots/[id]" options={{ title: "Details Bot" }} />
      <Stack.Screen name="agents" options={{ title: "Agents IA" }} />
      <Stack.Screen name="tax" options={{ title: "Fiscalite" }} />
      <Stack.Screen name="guide" options={{ title: "Guide" }} />
      <Stack.Screen name="contest" options={{ title: "Concours" }} />
    </Stack>
  );
}
