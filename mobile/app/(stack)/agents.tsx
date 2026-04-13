import { View, Text, ScrollView } from "react-native";
import { COLORS } from "../../lib/constants";

const agents = [
  { icon: "📊", name: "Agent Technique", desc: "RSI, MACD, Bollinger, supports/resistances" },
  { icon: "🧠", name: "Agent Sentiment", desc: "Analyse des reseaux sociaux et du Fear & Greed Index" },
  { icon: "⛓️", name: "Agent On-Chain", desc: "Flux whale, metriques blockchain, TVL" },
  { icon: "📅", name: "Agent Calendrier", desc: "Evenements macro, halving, unlock tokens" },
  { icon: "🛡️", name: "Agent Risque", desc: "Position sizing, stop loss, gestion du risque" },
  { icon: "🎯", name: "Agent Pattern", desc: "Detection de figures chartistes en temps reel" },
  { icon: "🤖", name: "Coordinateur IA", desc: "Synthese de tous les agents pour decision finale" },
];

export default function AgentsScreen() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} style={{ backgroundColor: COLORS.dark }}>
      <Text style={{ color: COLORS.gray, fontSize: 14, marginBottom: 4 }}>
        7 agents IA analysent le marche en continu pour generer des signaux de trading.
      </Text>
      {agents.map((a) => (
        <View key={a.name} style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Text style={{ fontSize: 32 }}>{a.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "600" }}>{a.name}</Text>
            <Text style={{ color: COLORS.gray, fontSize: 13, marginTop: 2 }}>{a.desc}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
