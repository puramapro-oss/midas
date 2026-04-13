import { View, Text, ScrollView, TouchableOpacity, Alert, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useAuthStore } from "../../../stores/auth";
import { COLORS } from "../../../lib/constants";

export default function OutilsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const code = profile?.referral_code ?? "---";
  const link = `https://midas.purama.dev/go/${code}`;

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copie !", "Copie dans le presse-papier.");
  };

  const share = async () => {
    try {
      await Share.share({
        message: `Decouvre MIDAS, la plateforme de trading IA qui genere des signaux automatiques ! ${link}`,
      });
    } catch {
      // cancelled
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      style={{ backgroundColor: COLORS.dark }}
    >
      <View style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, gap: 12 }}>
        <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700" }}>Ton lien partenaire</Text>
        <TouchableOpacity onPress={() => copy(link)} style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 14 }}>
          <Text style={{ color: COLORS.gold, fontSize: 14, textAlign: "center" }}>{link}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={share} style={{ backgroundColor: COLORS.gold, borderRadius: 10, paddingVertical: 12, alignItems: "center" }}>
          <Text style={{ color: COLORS.dark, fontWeight: "700" }}>Partager</Text>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, gap: 8 }}>
        <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700" }}>Messages pre-ecrits</Text>
        {[
          "MIDAS m'a permis de detecter des opportunites que je n'aurais jamais vues. L'IA analyse le marche 24/7 !",
          "Mes trades sont 3x plus rentables depuis que j'utilise les signaux MIDAS. Teste gratuitement !",
        ].map((msg, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => copy(msg + " " + link)}
            style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}
          >
            <Text style={{ color: COLORS.gray, fontSize: 14, lineHeight: 20 }}>{msg}</Text>
            <Text style={{ color: COLORS.gold, fontSize: 12, marginTop: 6 }}>Copier</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
