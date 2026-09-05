import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../lib/constants";
import { useAuthStore } from "../../stores/auth";

const resources = [
  { label: "Données de marché", description: "Observer des données générales sans recommandation.", href: "/(stack)/markets" as const },
  { label: "Simulation", description: "Tester des hypothèses avec des unités fictives.", href: "/(stack)/paper" as const },
  { label: "Alertes", description: "Suivre des seuils informatifs définis par l'utilisateur.", href: "/(stack)/alerts" as const },
  { label: "Aide", description: "Comprendre le périmètre éducatif de MIDAS.", href: "/(stack)/help" as const },
];

export default function DashboardScreen() {
  const profile = useAuthStore((state) => state.profile);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.dark }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ color: COLORS.gray, fontSize: 14 }}>Bonjour {profile?.full_name?.split(" ")[0] ?? ""}</Text>
          <Text style={{ color: COLORS.white, fontSize: 30, fontWeight: "800" }}>Comprendre les marchés crypto</Text>
          <Text style={{ color: COLORS.gray, fontSize: 16, lineHeight: 24 }}>
            Information générale et simulation éducative uniquement. Aucun conseil personnalisé, signal, ordre réel, exchange connecté ou promotion de service crypto en France.
          </Text>
        </View>

        <View style={{ borderWidth: 1, borderColor: "rgba(255,215,0,0.28)", backgroundColor: "rgba(255,215,0,0.06)", borderRadius: 18, padding: 18, gap: 6 }}>
          <Text style={{ color: COLORS.gold, fontWeight: "700", fontSize: 16 }}>Phase 1 — points uniquement</Text>
          <Text style={{ color: COLORS.gray, lineHeight: 21 }}>Aucun retrait monétaire, IBAN, KYC de versement ni parcours Swan n’est disponible.</Text>
        </View>

        <View style={{ gap: 12 }}>
          {resources.map((resource) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={resource.href}
              onPress={() => router.push(resource.href)}
              style={{ minHeight: 72, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)", padding: 16, justifyContent: "center" }}
            >
              <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: "700" }}>{resource.label}</Text>
              <Text style={{ color: COLORS.gray, marginTop: 4, lineHeight: 20 }}>{resource.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ color: COLORS.gray, fontSize: 12, lineHeight: 18 }}>
          Les contenus MIDAS ne constituent pas un conseil en investissement. Aucun achat ni lien d’achat n’est proposé dans l’application mobile.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
