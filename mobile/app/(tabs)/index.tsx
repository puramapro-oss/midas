import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "../../stores/auth";
import { useMarketStore } from "../../stores/market";
import { api } from "../../lib/api";
import { COLORS } from "../../lib/constants";
import type { Signal, Trade } from "../../lib/types";

export default function DashboardScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { prices, fetchPrices } = useMarketStore();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState<{
    total: number;
    pnl: number;
    pnlPercent: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    await fetchPrices();
    try {
      const [signalsData, tradesData, balanceData] = await Promise.all([
        api.get<{ signals: Signal[] }>("/signals").catch(() => ({ signals: [] })),
        api
          .get<{ trades: Trade[] }>("/trade/history?limit=5")
          .catch(() => ({ trades: [] })),
        api
          .get<{ total: number; pnl: number; pnlPercent: number }>(
            "/exchange/balance"
          )
          .catch(() => null),
      ]);
      setSignals(signalsData.signals?.slice(0, 3) ?? []);
      setTrades(tradesData.trades?.slice(0, 5) ?? []);
      if (balanceData) setBalance(balanceData);
    } catch {
      // silent
    }
  }, [fetchPrices]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.dark }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.gold}
          />
        }
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text style={{ color: COLORS.gray, fontSize: 14 }}>
              Bonjour, {profile?.full_name?.split(" ")[0] ?? "Trader"}
            </Text>
            <Text
              style={{
                color: COLORS.gold,
                fontSize: 28,
                fontWeight: "800",
              }}
            >
              MIDAS
            </Text>
          </View>
          <TouchableOpacity
            testID="settings-btn"
            onPress={() => router.push("/(stack)/settings")}
            style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: 12,
              padding: 10,
            }}
          >
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Portfolio Card */}
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <Text style={{ color: COLORS.gray, fontSize: 14, marginBottom: 4 }}>
            Portfolio
          </Text>
          <Text
            style={{
              color: COLORS.white,
              fontSize: 32,
              fontWeight: "700",
            }}
          >
            {balance
              ? `$${balance.total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}`
              : "--"}
          </Text>
          {balance && (
            <Text
              style={{
                color: balance.pnl >= 0 ? COLORS.green : COLORS.red,
                fontSize: 16,
                fontWeight: "600",
                marginTop: 4,
              }}
            >
              {balance.pnl >= 0 ? "+" : ""}
              {balance.pnlPercent.toFixed(2)}%
            </Text>
          )}

          {/* Quick Stats */}
          <View
            style={{
              flexDirection: "row",
              marginTop: 16,
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>Niveau</Text>
              <Text
                style={{
                  color: COLORS.white,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {profile?.level ?? 1}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>Streak</Text>
              <Text
                style={{
                  color: COLORS.gold,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {profile?.streak ?? 0}j
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>Points</Text>
              <Text
                style={{
                  color: COLORS.white,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {profile?.purama_points?.toLocaleString() ?? 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {[
            {
              icon: "📊",
              label: "Marches",
              route: "/(stack)/markets" as const,
            },
            {
              icon: "🤖",
              label: "Bots",
              route: "/(stack)/bots" as const,
            },
            {
              icon: "🔔",
              label: "Alertes",
              route: "/(stack)/alerts" as const,
            },
            {
              icon: "🏪",
              label: "Boutique",
              route: "/(stack)/boutique" as const,
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              testID={`quick-${item.label.toLowerCase()}`}
              onPress={() => router.push(item.route)}
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: 12,
                padding: 12,
                alignItems: "center",
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 24 }}>{item.icon}</Text>
              <Text
                style={{
                  color: COLORS.gray,
                  fontSize: 12,
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Top Prices */}
        <View>
          <Text
            style={{
              color: COLORS.white,
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 12,
            }}
          >
            Top Crypto
          </Text>
          {prices.slice(0, 5).map((p) => (
            <View
              key={p.symbol}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255,255,255,0.06)",
              }}
            >
              <Text
                style={{
                  color: COLORS.white,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {p.symbol}
              </Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: COLORS.white, fontSize: 16 }}>
                  ${p.price?.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) ?? "--"}
                </Text>
                <Text
                  style={{
                    color:
                      (p.change_24h ?? 0) >= 0 ? COLORS.green : COLORS.red,
                    fontSize: 14,
                  }}
                >
                  {(p.change_24h ?? 0) >= 0 ? "+" : ""}
                  {(p.change_24h ?? 0).toFixed(2)}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Active Signals */}
        {signals.length > 0 && (
          <View>
            <Text
              style={{
                color: COLORS.white,
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 12,
              }}
            >
              Signaux actifs
            </Text>
            {signals.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() =>
                  router.push(`/(stack)/analysis/${s.pair}` as never)
                }
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 8,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View>
                  <Text
                    style={{
                      color: COLORS.white,
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    {s.pair}
                  </Text>
                  <Text
                    style={{
                      color:
                        s.direction === "long" ? COLORS.green : COLORS.red,
                      fontSize: 14,
                    }}
                  >
                    {s.direction.toUpperCase()} - {s.confidence}%
                  </Text>
                </View>
                <Text style={{ color: COLORS.gray, fontSize: 14 }}>
                  TP: ${s.take_profit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Trades */}
        {trades.length > 0 && (
          <View>
            <Text
              style={{
                color: COLORS.white,
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 12,
              }}
            >
              Trades recents
            </Text>
            {trades.map((t) => (
              <View
                key={t.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255,255,255,0.06)",
                }}
              >
                <View>
                  <Text
                    style={{
                      color: COLORS.white,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    {t.pair}
                  </Text>
                  <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                    {t.direction.toUpperCase()} -{" "}
                    {t.is_paper_trade ? "Paper" : "Real"}
                  </Text>
                </View>
                <Text
                  style={{
                    color:
                      (t.pnl ?? 0) >= 0 ? COLORS.green : COLORS.red,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {(t.pnl ?? 0) >= 0 ? "+" : ""}
                  {(t.pnl ?? 0).toFixed(2)}%
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
