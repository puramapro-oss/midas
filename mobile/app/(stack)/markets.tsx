import { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  RefreshControl,
} from "react-native";
import { useMarketStore } from "../../stores/market";
import { COLORS } from "../../lib/constants";

export default function MarketsScreen() {
  const { prices, fetchPrices, loading } = useMarketStore();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const filtered = prices.filter((p) =>
    p.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPrices();
    setRefreshing(false);
  }, [fetchPrices]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark }}>
      <Text style={{ color: COLORS.gray, fontSize: 13, marginHorizontal: 16, marginTop: 16 }}>
        Donnees generales a but educatif. Elles ne constituent ni une recommandation ni un signal.
      </Text>
      <TextInput
        testID="market-search"
        placeholder="Rechercher une paire..."
        placeholderTextColor={COLORS.grayDark}
        value={search}
        onChangeText={setSearch}
        style={{
          margin: 16,
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          color: COLORS.white,
          fontSize: 15,
        }}
      />
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.symbol}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.gold}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255,255,255,0.06)",
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
                {item.symbol}
              </Text>
              <Text style={{ color: COLORS.gray, fontSize: 13 }}>
                Vol: ${(item.volume_24h / 1e6).toFixed(1)}M
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: COLORS.white, fontSize: 16 }}>
                ${item.price?.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) ?? "--"}
              </Text>
              <Text
                style={{
                  color:
                    (item.change_24h ?? 0) >= 0 ? COLORS.green : COLORS.red,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {(item.change_24h ?? 0) >= 0 ? "+" : ""}
                {(item.change_24h ?? 0).toFixed(2)}%
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}
