import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { COLORS } from "../../lib/constants";

export default function EarnScreen() {
  const ways = [
    { icon: "👥", title: "Parrainage", desc: "50% 1er paiement + 10% recurrent", route: "/(tabs)/referral" },
    { icon: "🏆", title: "Classement hebdo", desc: "6% du CA redistribue aux top 10", route: "/(tabs)/classement" },
    { icon: "🎰", title: "Tirage mensuel", desc: "4% du CA pour 10 gagnants", route: "/(stack)/lottery" },
    { icon: "🏪", title: "Boutique Points", desc: "Echange tes points contre des reductions", route: "/(stack)/boutique" },
    { icon: "🤝", title: "Partenaire", desc: "Deviens influenceur MIDAS", route: "/(stack)/partenaire" },
    { icon: "🎯", title: "Concours", desc: "Participe aux competitions", route: "/(stack)/contest" },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      style={{ backgroundColor: COLORS.dark }}
    >
      <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "800", marginBottom: 4 }}>
        Comment gagner avec MIDAS
      </Text>
      {ways.map((w) => (
        <TouchableOpacity
          key={w.title}
          onPress={() => router.push(w.route as never)}
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Text style={{ fontSize: 28 }}>{w.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "600" }}>{w.title}</Text>
            <Text style={{ color: COLORS.gray, fontSize: 13 }}>{w.desc}</Text>
          </View>
          <Text style={{ color: COLORS.gray }}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
