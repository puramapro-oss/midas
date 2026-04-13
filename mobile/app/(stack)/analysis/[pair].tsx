import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "../../../lib/api";
import { COLORS } from "../../../lib/constants";

interface AnalysisData {
  pair: string;
  summary: string;
  trend: "bullish" | "bearish" | "neutral";
  confidence: number;
  support: number;
  resistance: number;
  rsi: number;
  macd_signal: string;
  volume_trend: string;
  recommendation: string;
}

export default function AnalysisScreen() {
  const { pair } = useLocalSearchParams<{ pair: string }>();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<AnalysisData>(
          `/analysis/technical?pair=${pair?.replace("-", "/")}`
        );
        setAnalysis(data);
      } catch {
        // silent
      }
      setLoading(false);
    };
    load();
  }, [pair]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.dark,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={{ color: COLORS.gray, marginTop: 12 }}>
          Analyse en cours...
        </Text>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.dark,
          padding: 20,
        }}
      >
        <Text style={{ color: COLORS.gray, fontSize: 16, textAlign: "center" }}>
          Analyse indisponible pour {pair?.replace("-", "/")}
        </Text>
      </View>
    );
  }

  const trendColor =
    analysis.trend === "bullish"
      ? COLORS.green
      : analysis.trend === "bearish"
        ? COLORS.red
        : COLORS.gold;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      style={{ backgroundColor: COLORS.dark }}
    >
      {/* Header */}
      <View style={{ alignItems: "center", gap: 8 }}>
        <Text
          style={{ color: COLORS.white, fontSize: 24, fontWeight: "800" }}
        >
          {analysis.pair}
        </Text>
        <View
          style={{
            backgroundColor:
              analysis.trend === "bullish"
                ? "rgba(34,197,94,0.2)"
                : analysis.trend === "bearish"
                  ? "rgba(239,68,68,0.2)"
                  : "rgba(245,158,11,0.2)",
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 20,
          }}
        >
          <Text
            style={{ color: trendColor, fontWeight: "700", fontSize: 16 }}
          >
            {analysis.trend.toUpperCase()} - {analysis.confidence}%
          </Text>
        </View>
      </View>

      {/* Indicators */}
      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: 16,
          padding: 16,
          gap: 14,
        }}
      >
        <Text
          style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}
        >
          Indicateurs
        </Text>
        {[
          { label: "Support", value: `$${analysis.support}` },
          { label: "Resistance", value: `$${analysis.resistance}` },
          { label: "RSI", value: analysis.rsi.toString() },
          { label: "MACD", value: analysis.macd_signal },
          { label: "Volume", value: analysis.volume_trend },
        ].map((i) => (
          <View
            key={i.label}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: COLORS.gray, fontSize: 15 }}>
              {i.label}
            </Text>
            <Text
              style={{
                color: COLORS.white,
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              {i.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Recommendation */}
      <View
        style={{
          backgroundColor: "rgba(245,158,11,0.1)",
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: "rgba(245,158,11,0.2)",
        }}
      >
        <Text
          style={{
            color: COLORS.gold,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 8,
          }}
        >
          Recommandation MIDAS
        </Text>
        <Text style={{ color: COLORS.white, fontSize: 15, lineHeight: 22 }}>
          {analysis.recommendation}
        </Text>
      </View>

      {/* Summary */}
      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <Text
          style={{
            color: COLORS.white,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 8,
          }}
        >
          Resume
        </Text>
        <Text style={{ color: COLORS.gray, fontSize: 15, lineHeight: 22 }}>
          {analysis.summary}
        </Text>
      </View>
    </ScrollView>
  );
}
