import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../../lib/api";
import { COLORS } from "../../../lib/constants";

export default function ExchangesScreen() {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [exchange, setExchange] = useState("binance");
  const [loading, setLoading] = useState(false);

  const connectExchange = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      Alert.alert("Erreur", "Remplis la cle API et le secret.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/exchange/connect", {
        exchange,
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
      });
      Alert.alert("Connecte !", `${exchange} a ete connecte avec succes.`);
      setApiKey("");
      setApiSecret("");
    } catch (err) {
      Alert.alert(
        "Erreur",
        err instanceof Error ? err.message : "Connexion echouee."
      );
    }
    setLoading(false);
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      style={{ backgroundColor: COLORS.dark }}
    >
      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: 12,
          padding: 16,
          gap: 14,
        }}
      >
        <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>
          Connecter un exchange
        </Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {["binance", "bybit", "kraken"].map((e) => (
            <TouchableOpacity
              key={e}
              onPress={() => setExchange(e)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor:
                  exchange === e ? COLORS.gold : "rgba(255,255,255,0.05)",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: exchange === e ? COLORS.dark : COLORS.gray,
                  fontWeight: "600",
                  fontSize: 13,
                }}
              >
                {e.charAt(0).toUpperCase() + e.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          testID="api-key"
          placeholder="Cle API"
          placeholderTextColor={COLORS.grayDark}
          value={apiKey}
          onChangeText={setApiKey}
          autoCapitalize="none"
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: COLORS.white,
            fontSize: 15,
          }}
        />

        <TextInput
          testID="api-secret"
          placeholder="Secret API"
          placeholderTextColor={COLORS.grayDark}
          value={apiSecret}
          onChangeText={setApiSecret}
          secureTextEntry
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: COLORS.white,
            fontSize: 15,
          }}
        />

        <TouchableOpacity
          testID="connect-exchange"
          onPress={connectExchange}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.gold, COLORS.goldDark]}
            style={{ borderRadius: 12, paddingVertical: 14, alignItems: "center" }}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.dark} />
            ) : (
              <Text style={{ color: COLORS.dark, fontWeight: "700", fontSize: 16 }}>
                Connecter {exchange}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
