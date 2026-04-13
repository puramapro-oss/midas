import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { api } from "../../lib/api";
import { COLORS } from "../../lib/constants";
import type { Alert as AlertType } from "../../lib/types";

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [pair, setPair] = useState("BTC/USDT");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ alerts: AlertType[] }>("/alerts");
      setAlerts(data.alerts ?? []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createAlert = async () => {
    if (!price || Number(price) <= 0) {
      Alert.alert("Erreur", "Entre un prix valide.");
      return;
    }
    try {
      await api.post("/alerts", {
        pair,
        condition,
        value: Number(price),
      });
      setPrice("");
      load();
    } catch {
      Alert.alert("Erreur", "Impossible de creer l'alerte.");
    }
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
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: 12,
          padding: 16,
          gap: 12,
        }}
      >
        <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "600" }}>
          Nouvelle alerte
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {["above", "below"].map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCondition(c as "above" | "below")}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor:
                  condition === c ? COLORS.gold : "rgba(255,255,255,0.05)",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: condition === c ? COLORS.dark : COLORS.gray,
                  fontWeight: "600",
                }}
              >
                {c === "above" ? "Au-dessus" : "En-dessous"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          placeholder={`Prix (${pair})`}
          placeholderTextColor={COLORS.grayDark}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: COLORS.white,
            fontSize: 16,
          }}
        />
        <TouchableOpacity
          testID="create-alert"
          onPress={createAlert}
          style={{
            backgroundColor: COLORS.gold,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: COLORS.dark, fontWeight: "700" }}>
            Creer l'alerte
          </Text>
        </TouchableOpacity>
      </View>

      {alerts.map((a) => (
        <View
          key={a.id}
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            padding: 14,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text style={{ color: COLORS.white, fontWeight: "600" }}>
              {a.pair}
            </Text>
            <Text style={{ color: COLORS.gray, fontSize: 13 }}>
              {a.condition === "above" ? "Au-dessus" : "En-dessous"} de $
              {a.value}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: a.is_active
                ? "rgba(34,197,94,0.2)"
                : "rgba(156,163,175,0.2)",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                color: a.is_active ? COLORS.green : COLORS.gray,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {a.is_active ? "Active" : "Inactif"}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
