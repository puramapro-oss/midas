import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { router } from "expo-router";
import { api } from "../../lib/api";
import { COLORS } from "../../lib/constants";
import type { Bot } from "../../lib/types";

export default function BotsScreen() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ bots: Bot[] }>("/bot/create");
      setBots(data.bots ?? []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      style={{ backgroundColor: COLORS.dark }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
    >
      {bots.length === 0 && (
        <View style={{ alignItems: "center", padding: 40 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🤖</Text>
          <Text style={{ color: COLORS.gray, textAlign: "center", fontSize: 16 }}>
            Aucun bot configure. Cree ton premier bot de trading automatique !
          </Text>
        </View>
      )}
      {bots.map((b) => (
        <TouchableOpacity
          key={b.id}
          onPress={() => router.push(`/(stack)/bots/${b.id}` as never)}
          style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16 }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>{b.name}</Text>
            <View style={{ backgroundColor: b.is_active ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ color: b.is_active ? COLORS.green : COLORS.red, fontSize: 12, fontWeight: "600" }}>
                {b.is_active ? "Actif" : "Inactif"}
              </Text>
            </View>
          </View>
          <Text style={{ color: COLORS.gray, marginTop: 6 }}>{b.pair} - {b.strategy}</Text>
          <View style={{ flexDirection: "row", marginTop: 10, gap: 16 }}>
            <View>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>Trades</Text>
              <Text style={{ color: COLORS.white, fontWeight: "600" }}>{b.total_trades}</Text>
            </View>
            <View>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>Win Rate</Text>
              <Text style={{ color: COLORS.gold, fontWeight: "600" }}>{b.win_rate}%</Text>
            </View>
            <View>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>PnL</Text>
              <Text style={{ color: b.total_pnl >= 0 ? COLORS.green : COLORS.red, fontWeight: "600" }}>
                {b.total_pnl >= 0 ? "+" : ""}{b.total_pnl.toFixed(2)}%
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
