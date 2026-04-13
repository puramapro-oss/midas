import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { COLORS } from "../../lib/constants";

export default function HelpScreen() {
  const guides = [
    {
      icon: "🔗",
      title: "Connecter Binance",
      desc: "Lie ton exchange pour trader depuis MIDAS",
      route: "/(stack)/help/connect-binance",
    },
    {
      icon: "❓",
      title: "FAQ",
      desc: "Questions frequentes",
      route: "/(stack)/help/faq",
    },
    {
      icon: "📖",
      title: "Guide complet",
      desc: "Decouvre toutes les fonctionnalites",
      route: "/(stack)/guide",
    },
    {
      icon: "📧",
      title: "Contact",
      desc: "purama.pro@gmail.com",
      route: null,
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      style={{ backgroundColor: COLORS.dark }}
    >
      <Text style={{ color: COLORS.gray, fontSize: 14, marginBottom: 4 }}>
        Comment pouvons-nous t'aider ?
      </Text>

      {guides.map((g) => (
        <TouchableOpacity
          key={g.title}
          onPress={() => g.route && router.push(g.route as never)}
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Text style={{ fontSize: 28 }}>{g.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "600" }}>
              {g.title}
            </Text>
            <Text style={{ color: COLORS.gray, fontSize: 13 }}>{g.desc}</Text>
          </View>
          {g.route && <Text style={{ color: COLORS.gray }}>›</Text>}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
