import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { COLORS } from "../../lib/constants";

interface RankEntry {
  rank: number;
  user_id: string;
  full_name: string;
  score: number;
  tier: string;
  avatar: string | null;
}

export default function ClassementScreen() {
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ rankings: RankEntry[] }>("/ranking");
      setRankings(data.rankings ?? []);
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

  const medalEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

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
          Classement
        </Text>

        <Text style={{ color: COLORS.gray, fontSize: 14 }}>
          Top traders de la semaine
        </Text>

        {rankings.length === 0 && (
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: 16,
              padding: 40,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🏆</Text>
            <Text
              style={{
                color: COLORS.gray,
                fontSize: 16,
                textAlign: "center",
              }}
            >
              Le classement sera disponible a la fin de la semaine.
            </Text>
          </View>
        )}

        {rankings.map((r) => (
          <View
            key={r.user_id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor:
                r.rank <= 3
                  ? "rgba(245,158,11,0.08)"
                  : "rgba(255,255,255,0.05)",
              borderRadius: 12,
              padding: 14,
              borderWidth: r.rank <= 3 ? 1 : 0,
              borderColor:
                r.rank <= 3 ? "rgba(245,158,11,0.2)" : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: r.rank <= 3 ? 24 : 16,
                width: 40,
                textAlign: "center",
                color: COLORS.white,
              }}
            >
              {medalEmoji(r.rank)}
            </Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={{
                  color: COLORS.white,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {r.full_name}
              </Text>
              <Text style={{ color: COLORS.gray, fontSize: 13 }}>
                {r.tier.charAt(0).toUpperCase() + r.tier.slice(1)}
              </Text>
            </View>
            <Text
              style={{
                color: COLORS.gold,
                fontSize: 18,
                fontWeight: "700",
              }}
            >
              {r.score?.toLocaleString() ?? 0}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
