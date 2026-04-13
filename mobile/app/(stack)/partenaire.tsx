import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { router } from "expo-router";
import { api } from "../../lib/api";
import { COLORS } from "../../lib/constants";

interface PartnerStats {
  clicks: number;
  signups: number;
  conversions: number;
  revenue: number;
  conversion_rate: number;
  tier: string;
}

export default function PartenaireScreen() {
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<PartnerStats>("/partner/stats");
      setStats(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      style={{ backgroundColor: COLORS.dark }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />
      }
    >
      <View
        style={{
          backgroundColor: "rgba(245,158,11,0.1)",
          borderRadius: 16,
          padding: 20,
          gap: 12,
        }}
      >
        <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "800" }}>
          Dashboard Partenaire
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {[
            { label: "Clics", value: stats?.clicks ?? 0 },
            { label: "Inscrits", value: stats?.signups ?? 0 },
            { label: "Conversions", value: stats?.conversions ?? 0 },
          ].map((s) => (
            <View key={s.label} style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "700" }}>
                {s.value}
              </Text>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>{s.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: COLORS.gray, fontSize: 12 }}>Revenus totaux</Text>
          <Text style={{ color: COLORS.green, fontSize: 28, fontWeight: "800" }}>
            {(stats?.revenue ?? 0).toFixed(2)}€
          </Text>
        </View>
      </View>

      {[
        { label: "Commissions", icon: "💰", route: "/(stack)/partenaire/commissions" },
        { label: "Outils", icon: "🔧", route: "/(stack)/partenaire/outils" },
      ].map((item) => (
        <TouchableOpacity
          key={item.label}
          onPress={() => router.push(item.route as never)}
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 24 }}>{item.icon}</Text>
          <Text style={{ color: COLORS.white, fontSize: 16, flex: 1 }}>{item.label}</Text>
          <Text style={{ color: COLORS.gray }}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
