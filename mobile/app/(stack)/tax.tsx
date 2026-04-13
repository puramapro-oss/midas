import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { api } from "../../lib/api";
import { COLORS } from "../../lib/constants";

export default function TaxScreen() {
  const [loading, setLoading] = useState(false);
  const currentYear = new Date().getFullYear();

  const downloadReport = async (year: number) => {
    setLoading(true);
    try {
      const data = await api.get<{ total_pnl: number; total_trades: number; tax_due: number }>(`/tax/${year}`);
      Alert.alert(
        `Rapport fiscal ${year}`,
        `PnL total: ${data.total_pnl?.toFixed(2) ?? 0}€\nTrades: ${data.total_trades ?? 0}\nImpot estime: ${data.tax_due?.toFixed(2) ?? 0}€`
      );
    } catch {
      Alert.alert("Erreur", "Impossible de generer le rapport.");
    }
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} style={{ backgroundColor: COLORS.dark }}>
      <View style={{ backgroundColor: "rgba(245,158,11,0.1)", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.2)" }}>
        <Text style={{ color: COLORS.gold, fontWeight: "700", fontSize: 16 }}>Cerfa 2086</Text>
        <Text style={{ color: COLORS.white, fontSize: 14, marginTop: 6, lineHeight: 20 }}>
          MIDAS genere automatiquement ton rapport fiscal conforme au Cerfa 2086 pour la declaration de tes plus-values crypto.
        </Text>
      </View>

      {[currentYear, currentYear - 1].map((year) => (
        <TouchableOpacity
          key={year}
          onPress={() => downloadReport(year)}
          disabled={loading}
          style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        >
          <View>
            <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "600" }}>Rapport {year}</Text>
            <Text style={{ color: COLORS.gray, fontSize: 13 }}>PDF Cerfa 2086 + details</Text>
          </View>
          {loading ? <ActivityIndicator color={COLORS.gold} /> : <Text style={{ color: COLORS.gold, fontWeight: "600" }}>Generer</Text>}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
