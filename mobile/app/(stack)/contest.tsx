import { View, Text, ScrollView } from "react-native";
import { COLORS } from "../../lib/constants";

export default function ContestScreen() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} style={{ backgroundColor: COLORS.dark }}>
      <View style={{ alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Text style={{ fontSize: 48 }}>🎯</Text>
        <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "800" }}>Concours MIDAS</Text>
      </View>

      <View style={{ backgroundColor: "rgba(245,158,11,0.1)", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.2)" }}>
        <Text style={{ color: COLORS.gold, fontSize: 18, fontWeight: "700" }}>Classement hebdomadaire</Text>
        <Text style={{ color: COLORS.white, fontSize: 14, marginTop: 8, lineHeight: 20 }}>
          Chaque dimanche a 23h59, les 10 meilleurs traders se partagent 6% du CA. Score = parrainages x10 + abos x50 + jours actifs x5 + missions x3.
        </Text>
        <View style={{ marginTop: 12, gap: 4 }}>
          {["1er = 2%", "2eme = 1%", "3eme = 0.7%", "4eme = 0.5%", "5eme = 0.4%", "6eme = 0.3%", "7-10eme = 1.1%"].map((r) => (
            <Text key={r} style={{ color: COLORS.gray, fontSize: 13 }}>• {r} du CA</Text>
          ))}
        </View>
      </View>

      <View style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 20 }}>
        <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>Tirage mensuel</Text>
        <Text style={{ color: COLORS.gray, fontSize: 14, marginTop: 8, lineHeight: 20 }}>
          Le dernier jour du mois, 10 utilisateurs actifs tires au sort se partagent 4% du CA. Plus tu as de tickets, plus tu as de chances !
        </Text>
      </View>

      <View style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 20 }}>
        <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>Concours speciaux</Text>
        <Text style={{ color: COLORS.gray, fontSize: 14, marginTop: 8, lineHeight: 20 }}>
          Chaque trimestre, un concours thematique avec 10 gagnants selectionnes par jury + IA. Reste connecte pour ne rien rater !
        </Text>
      </View>
    </ScrollView>
  );
}
