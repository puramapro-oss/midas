import { View, Text, ScrollView } from "react-native";
import { COLORS } from "../../../lib/constants";

export default function ConnectBinanceScreen() {
  const steps = [
    {
      n: 1,
      title: "Cree une cle API Binance",
      desc: "Va dans tes parametres Binance > API Management > Cree une nouvelle cle.",
    },
    {
      n: 2,
      title: "Configure les permissions",
      desc: "Active uniquement 'Enable Reading' et 'Enable Spot & Margin Trading'. JAMAIS les retraits.",
    },
    {
      n: 3,
      title: "Restriction IP",
      desc: "Pour plus de securite, restreins la cle a l'IP de MIDAS. Facultatif mais recommande.",
    },
    {
      n: 4,
      title: "Copie la cle et le secret",
      desc: "Copie la cle API et le secret. Le secret ne sera plus visible apres.",
    },
    {
      n: 5,
      title: "Ajoute dans MIDAS",
      desc: "Va dans Parametres > Exchanges et colle ta cle API et ton secret.",
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      style={{ backgroundColor: COLORS.dark }}
    >
      <View
        style={{
          backgroundColor: "rgba(245,158,11,0.1)",
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: "rgba(245,158,11,0.2)",
        }}
      >
        <Text style={{ color: COLORS.gold, fontWeight: "700", fontSize: 16 }}>
          Securite
        </Text>
        <Text style={{ color: COLORS.white, fontSize: 14, marginTop: 6, lineHeight: 20 }}>
          MIDAS ne peut JAMAIS retirer tes fonds. Seules les permissions de
          lecture et de trading sont necessaires. Tes cles sont chiffrees en
          AES-256.
        </Text>
      </View>

      {steps.map((s) => (
        <View
          key={s.n}
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            gap: 14,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: COLORS.gold,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: COLORS.dark, fontWeight: "800" }}>
              {s.n}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: COLORS.white,
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              {s.title}
            </Text>
            <Text
              style={{
                color: COLORS.gray,
                fontSize: 14,
                marginTop: 4,
                lineHeight: 20,
              }}
            >
              {s.desc}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
