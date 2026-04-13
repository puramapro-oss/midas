import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { api } from "../../lib/api";
import { COLORS } from "../../lib/constants";
import type { Trade } from "../../lib/types";

export default function PaperScreen() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ trades: Trade[] }>("/paper/trades");
      setTrades(data.trades ?? []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const winRate = trades.length > 0
    ? (trades.filter((t) => (t.pnl ?? 0) > 0).length / trades.length) * 100
    : 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      style={{ backgroundColor: COLORS.dark }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
    >
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, alignItems: "center" }}>
          <Text style={{ color: COLORS.gray, fontSize: 12 }}>PnL total</Text>
          <Text style={{ color: totalPnl >= 0 ? COLORS.green : COLORS.red, fontSize: 24, fontWeight: "700" }}>
            {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}%
          </Text>
        </View>
        <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, alignItems: "center" }}>
          <Text style={{ color: COLORS.gray, fontSize: 12 }}>Win Rate</Text>
          <Text style={{ color: COLORS.gold, fontSize: 24, fontWeight: "700" }}>{winRate.toFixed(0)}%</Text>
        </View>
      </View>

      {trades.map((t) => (
        <View key={t.id} style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 14, flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: COLORS.white, fontWeight: "600" }}>{t.pair} {t.direction.toUpperCase()}</Text>
            <Text style={{ color: COLORS.gray, fontSize: 12 }}>{new Date(t.created_at).toLocaleDateString("fr-FR")}</Text>
          </View>
          <Text style={{ color: (t.pnl ?? 0) >= 0 ? COLORS.green : COLORS.red, fontWeight: "700" }}>
            {(t.pnl ?? 0) >= 0 ? "+" : ""}{(t.pnl ?? 0).toFixed(2)}%
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
