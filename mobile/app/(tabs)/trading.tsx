import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../lib/api";
import { COLORS } from "../../lib/constants";
import type { Trade, Bot } from "../../lib/types";

export default function TradingScreen() {
  const [tab, setTab] = useState<"trade" | "bots" | "paper">("trade");
  const [pair, setPair] = useState("BTC/USDT");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [positions, setPositions] = useState<Trade[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [posData, botData] = await Promise.all([
        api
          .get<{ trades: Trade[] }>("/trade/history?status=open")
          .catch(() => ({ trades: [] })),
        api.get<{ bots: Bot[] }>("/bot/create").catch(() => ({ bots: [] })),
      ]);
      setPositions(posData.trades ?? []);
      setBots(botData.bots ?? []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const executeTrade = async () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert("Erreur", "Entre un montant valide.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/trade/execute", {
        pair,
        direction,
        amount: Number(amount),
        type: tab === "paper" ? "paper" : "market",
      });
      Alert.alert("Trade execute", `${direction.toUpperCase()} ${pair}`);
      setAmount("");
      loadData();
    } catch (err) {
      Alert.alert(
        "Erreur",
        err instanceof Error ? err.message : "Echec du trade"
      );
    }
    setLoading(false);
  };

  const closeTrade = async (tradeId: string) => {
    try {
      await api.post("/trade/close", { trade_id: tradeId });
      loadData();
    } catch {
      Alert.alert("Erreur", "Impossible de fermer le trade.");
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.dark }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.gold}
          />
        }
      >
        <Text
          style={{
            color: COLORS.white,
            fontSize: 24,
            fontWeight: "800",
          }}
        >
          Trading
        </Text>

        {/* Tabs */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["trade", "bots", "paper"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor:
                  tab === t ? COLORS.gold : "rgba(255,255,255,0.05)",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: tab === t ? COLORS.dark : COLORS.gray,
                  fontWeight: "600",
                  fontSize: 14,
                }}
              >
                {t === "trade"
                  ? "Trade"
                  : t === "bots"
                    ? "Bots"
                    : "Paper"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {(tab === "trade" || tab === "paper") && (
          <>
            {/* Pair Selector */}
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: 12,
                padding: 16,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                {["BTC/USDT", "ETH/USDT", "SOL/USDT"].map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPair(p)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor:
                        pair === p
                          ? "rgba(245,158,11,0.2)"
                          : "rgba(255,255,255,0.05)",
                      borderWidth: 1,
                      borderColor:
                        pair === p ? COLORS.gold : "rgba(255,255,255,0.06)",
                    }}
                  >
                    <Text
                      style={{
                        color: pair === p ? COLORS.gold : COLORS.gray,
                        fontWeight: "600",
                        fontSize: 13,
                      }}
                    >
                      {p.split("/")[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Direction */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  testID="direction-long"
                  onPress={() => setDirection("long")}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor:
                      direction === "long"
                        ? "rgba(34,197,94,0.2)"
                        : "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor:
                      direction === "long"
                        ? COLORS.green
                        : "rgba(255,255,255,0.06)",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color:
                        direction === "long" ? COLORS.green : COLORS.gray,
                      fontWeight: "700",
                    }}
                  >
                    LONG
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="direction-short"
                  onPress={() => setDirection("short")}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor:
                      direction === "short"
                        ? "rgba(239,68,68,0.2)"
                        : "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor:
                      direction === "short"
                        ? COLORS.red
                        : "rgba(255,255,255,0.06)",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color:
                        direction === "short" ? COLORS.red : COLORS.gray,
                      fontWeight: "700",
                    }}
                  >
                    SHORT
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <TextInput
                testID="trade-amount"
                placeholder="Montant (USDT)"
                placeholderTextColor={COLORS.grayDark}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: COLORS.white,
                  fontSize: 16,
                }}
              />

              {/* Execute Button */}
              <TouchableOpacity
                testID="execute-trade"
                onPress={executeTrade}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    direction === "long"
                      ? [COLORS.green, "#16A34A"]
                      : [COLORS.red, "#DC2626"]
                  }
                  style={{
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: "center",
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text
                      style={{
                        color: COLORS.white,
                        fontSize: 16,
                        fontWeight: "700",
                      }}
                    >
                      {tab === "paper" ? "Paper Trade" : "Executer"}{" "}
                      {direction.toUpperCase()} {pair}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Open Positions */}
            {positions.length > 0 && (
              <View>
                <Text
                  style={{
                    color: COLORS.white,
                    fontSize: 18,
                    fontWeight: "700",
                    marginBottom: 12,
                  }}
                >
                  Positions ouvertes
                </Text>
                {positions.map((p) => (
                  <View
                    key={p.id}
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
                          fontWeight: "600",
                        }}
                      >
                        {p.pair} {p.direction.toUpperCase()}
                      </Text>
                      <Text
                        style={{
                          color:
                            (p.pnl ?? 0) >= 0 ? COLORS.green : COLORS.red,
                          fontSize: 14,
                        }}
                      >
                        PnL: {(p.pnl ?? 0).toFixed(2)}%
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => closeTrade(p.id)}
                      style={{
                        backgroundColor: "rgba(239,68,68,0.2)",
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: COLORS.red, fontWeight: "600" }}>
                        Fermer
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {tab === "bots" && (
          <View>
            <TouchableOpacity
              testID="create-bot"
              onPress={() => router.push("/(stack)/bots" as never)}
              style={{
                backgroundColor: "rgba(245,158,11,0.1)",
                borderWidth: 1,
                borderColor: COLORS.gold,
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text style={{ color: COLORS.gold, fontWeight: "600" }}>
                + Creer un bot
              </Text>
            </TouchableOpacity>
            {bots.map((b) => (
              <TouchableOpacity
                key={b.id}
                onPress={() =>
                  router.push(`/(stack)/bots/${b.id}` as never)
                }
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.white,
                      fontWeight: "600",
                      fontSize: 16,
                    }}
                  >
                    {b.name}
                  </Text>
                  <View
                    style={{
                      backgroundColor: b.is_active
                        ? "rgba(34,197,94,0.2)"
                        : "rgba(239,68,68,0.2)",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: b.is_active ? COLORS.green : COLORS.red,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {b.is_active ? "Actif" : "Inactif"}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: COLORS.gray, marginTop: 4 }}>
                  {b.pair} - {b.strategy} - WR: {b.win_rate}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
