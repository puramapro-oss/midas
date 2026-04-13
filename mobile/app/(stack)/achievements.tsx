import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { api } from "../../lib/api";
import { COLORS } from "../../lib/constants";
import type { Achievement } from "../../lib/types";

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ achievements: Achievement[] }>(
        "/achievements"
      );
      setAchievements(data.achievements ?? []);
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

  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

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
      <Text style={{ color: COLORS.gray, fontSize: 14 }}>
        {unlocked.length}/{achievements.length} debloques
      </Text>

      {unlocked.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text
            style={{ color: COLORS.gold, fontSize: 16, fontWeight: "700" }}
          >
            Debloques
          </Text>
          {unlocked.map((a) => (
            <View
              key={a.id}
              style={{
                backgroundColor: "rgba(245,158,11,0.1)",
                borderRadius: 12,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderWidth: 1,
                borderColor: "rgba(245,158,11,0.2)",
              }}
            >
              <Text style={{ fontSize: 28 }}>{a.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: COLORS.white,
                    fontWeight: "600",
                    fontSize: 15,
                  }}
                >
                  {a.name}
                </Text>
                <Text style={{ color: COLORS.gray, fontSize: 13 }}>
                  {a.description}
                </Text>
              </View>
              <Text style={{ color: COLORS.gold, fontWeight: "700" }}>
                +{a.xp_reward} XP
              </Text>
            </View>
          ))}
        </View>
      )}

      {locked.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text
            style={{ color: COLORS.gray, fontSize: 16, fontWeight: "700" }}
          >
            A debloquer
          </Text>
          {locked.map((a) => (
            <View
              key={a.id}
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                borderRadius: 12,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                opacity: 0.6,
              }}
            >
              <Text style={{ fontSize: 28 }}>🔒</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: COLORS.white,
                    fontWeight: "600",
                    fontSize: 15,
                  }}
                >
                  {a.name}
                </Text>
                <Text style={{ color: COLORS.gray, fontSize: 13 }}>
                  {a.description}
                </Text>
              </View>
              <Text style={{ color: COLORS.gray }}>+{a.xp_reward} XP</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
