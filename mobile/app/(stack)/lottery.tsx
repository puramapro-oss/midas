import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { api } from "../../lib/api";
import { COLORS } from "../../lib/constants";

export default function LotteryScreen() {
  const [draw, setDraw] = useState<{
    id: string;
    draw_date: string;
    pool_amount: number;
    status: string;
  } | null>(null);
  const [tickets, setTickets] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{
        current_draw: typeof draw;
        user_tickets: number;
      }>("/lottery");
      setDraw(data.current_draw);
      setTickets(data.user_tickets ?? 0);
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
      contentContainerStyle={{ padding: 16, gap: 20 }}
      style={{ backgroundColor: COLORS.dark }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.gold}
        />
      }
    >
      <View style={{ alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 64 }}>🎰</Text>
        <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "800" }}>
          Tirage mensuel
        </Text>
      </View>

      {draw && (
        <View
          style={{
            backgroundColor: "rgba(245,158,11,0.1)",
            borderRadius: 16,
            padding: 20,
            alignItems: "center",
            gap: 8,
            borderWidth: 1,
            borderColor: "rgba(245,158,11,0.2)",
          }}
        >
          <Text style={{ color: COLORS.gray, fontSize: 14 }}>
            Cagnotte actuelle
          </Text>
          <Text
            style={{ color: COLORS.gold, fontSize: 36, fontWeight: "800" }}
          >
            {draw.pool_amount.toFixed(2)}€
          </Text>
          <Text style={{ color: COLORS.gray, fontSize: 14 }}>
            Tirage le{" "}
            {new Date(draw.draw_date).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>
      )}

      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: 16,
          padding: 20,
          alignItems: "center",
        }}
      >
        <Text style={{ color: COLORS.gray, fontSize: 14 }}>Tes tickets</Text>
        <Text
          style={{ color: COLORS.white, fontSize: 48, fontWeight: "800" }}
        >
          {tickets}
        </Text>
        <Text style={{ color: COLORS.gray, fontSize: 13, textAlign: "center" }}>
          Gagne des tickets en parrainant, en faisant des missions et en etant
          actif !
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700", marginBottom: 12 }}>
          Comment gagner des tickets
        </Text>
        {[
          { label: "Inscription", tickets: "+1" },
          { label: "Parrainage", tickets: "+2" },
          { label: "Mission completee", tickets: "+1" },
          { label: "Partage quotidien", tickets: "+1" },
          { label: "Avis sur le store", tickets: "+3" },
          { label: "Streak 7 jours", tickets: "+1" },
          { label: "Streak 30 jours", tickets: "+5" },
          { label: "Abonnement", tickets: "+5/mois" },
          { label: "500 points", tickets: "= 1 ticket" },
        ].map((item) => (
          <View
            key={item.label}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255,255,255,0.04)",
            }}
          >
            <Text style={{ color: COLORS.gray, fontSize: 14 }}>
              {item.label}
            </Text>
            <Text style={{ color: COLORS.gold, fontWeight: "600", fontSize: 14 }}>
              {item.tickets}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
