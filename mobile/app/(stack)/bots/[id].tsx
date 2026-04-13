import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "../../../lib/api";
import { COLORS } from "../../../lib/constants";
import type { Bot } from "../../../lib/types";

export default function BotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bot, setBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Bot>(`/bot/update?id=${id}`).then(setBot).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const toggleBot = async () => {
    if (!bot) return;
    try {
      await api.post("/bot/toggle", { bot_id: bot.id, is_active: !bot.is_active });
      setBot({ ...bot, is_active: !bot.is_active });
    } catch {
      Alert.alert("Erreur", "Impossible de changer l'etat du bot.");
    }
  };

  if (loading) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.dark }}><ActivityIndicator color={COLORS.gold} size="large" /></View>;
  if (!bot) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.dark }}><Text style={{ color: COLORS.gray }}>Bot introuvable</Text></View>;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} style={{ backgroundColor: COLORS.dark }}>
      <View style={{ alignItems: "center", gap: 8 }}>
        <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "800" }}>{bot.name}</Text>
        <Text style={{ color: COLORS.gray }}>{bot.pair} - {bot.strategy}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        {[
          { label: "Trades", value: bot.total_trades.toString(), color: COLORS.white },
          { label: "Win Rate", value: `${bot.win_rate}%`, color: COLORS.gold },
          { label: "PnL", value: `${bot.total_pnl >= 0 ? "+" : ""}${bot.total_pnl.toFixed(2)}%`, color: bot.total_pnl >= 0 ? COLORS.green : COLORS.red },
        ].map((s) => (
          <View key={s.label} style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, alignItems: "center" }}>
            <Text style={{ color: COLORS.gray, fontSize: 12 }}>{s.label}</Text>
            <Text style={{ color: s.color, fontSize: 20, fontWeight: "700" }}>{s.value}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity testID="toggle-bot" onPress={toggleBot} style={{ backgroundColor: bot.is_active ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)", borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
        <Text style={{ color: bot.is_active ? COLORS.red : COLORS.green, fontSize: 16, fontWeight: "700" }}>
          {bot.is_active ? "Desactiver le bot" : "Activer le bot"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
