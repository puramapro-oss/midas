import { View, Text, ScrollView } from "react-native";
import { COLORS } from "../../lib/constants";

const steps = [
  { n: 1, title: "Connecte ton exchange", desc: "Lie Binance, Bybit ou Kraken pour trader depuis MIDAS." },
  { n: 2, title: "Explore les signaux", desc: "L'IA analyse 7 dimensions du marche et genere des signaux automatiques." },
  { n: 3, title: "Execute tes trades", desc: "Trade manuellement ou active un bot pour automatiser." },
  { n: 4, title: "Gere ton risque", desc: "Configure tes limites de perte et laisse le Shield te proteger." },
  { n: 5, title: "Gagne des points", desc: "Chaque action te rapporte des points echangeables en boutique." },
  { n: 6, title: "Parraine tes amis", desc: "50% du premier paiement + 10% a vie pour chaque filleul." },
  { n: 7, title: "Monte en classement", desc: "Les top 10 traders gagnent 6% du CA chaque semaine." },
];

export default function GuideScreen() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} style={{ backgroundColor: COLORS.dark }}>
      <View style={{ alignItems: "center", marginBottom: 8 }}>
        <Text style={{ fontSize: 48, marginBottom: 8 }}>📖</Text>
        <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "800" }}>Guide MIDAS</Text>
        <Text style={{ color: COLORS.gray, fontSize: 14 }}>7 etapes pour devenir un trader IA</Text>
      </View>
      {steps.map((s) => (
        <View key={s.n} style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, flexDirection: "row", gap: 14 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.gold, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: COLORS.dark, fontWeight: "800", fontSize: 16 }}>{s.n}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.white, fontWeight: "600", fontSize: 16 }}>{s.title}</Text>
            <Text style={{ color: COLORS.gray, fontSize: 14, marginTop: 4, lineHeight: 20 }}>{s.desc}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
