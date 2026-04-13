import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useAuthStore } from "../../stores/auth";
import { api } from "../../lib/api";
import { COLORS } from "../../lib/constants";
import type { ShopItem } from "../../lib/types";

export default function BoutiqueScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ items: ShopItem[] }>("/boutique");
      setItems(data.items ?? []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const purchase = async (item: ShopItem) => {
    if ((profile?.purama_points ?? 0) < item.cost_points) {
      Alert.alert("Points insuffisants", "Tu n'as pas assez de points.");
      return;
    }
    Alert.alert("Confirmer", `Acheter ${item.name} pour ${item.cost_points} pts ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Acheter",
        onPress: async () => {
          try {
            await api.post("/boutique", { item_id: item.id });
            Alert.alert("Achat reussi !", `${item.name} a ete ajoute.`);
            load();
          } catch {
            Alert.alert("Erreur", "L'achat a echoue.");
          }
        },
      },
    ]);
  };

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
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.gold}
        />
      }
    >
      <View
        style={{
          backgroundColor: "rgba(245,158,11,0.1)",
          borderRadius: 12,
          padding: 16,
          alignItems: "center",
        }}
      >
        <Text style={{ color: COLORS.gray, fontSize: 14 }}>Tes points</Text>
        <Text
          style={{ color: COLORS.gold, fontSize: 32, fontWeight: "800" }}
        >
          {profile?.purama_points?.toLocaleString() ?? 0}
        </Text>
      </View>

      {items.map((item) => (
        <View
          key={item.id}
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: COLORS.white,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {item.name}
            </Text>
            <Text style={{ color: COLORS.gray, fontSize: 13, marginTop: 2 }}>
              {item.description}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => purchase(item)}
            style={{
              backgroundColor: "rgba(245,158,11,0.2)",
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 8,
              marginLeft: 12,
            }}
          >
            <Text style={{ color: COLORS.gold, fontWeight: "700", fontSize: 14 }}>
              {item.cost_points} pts
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}
