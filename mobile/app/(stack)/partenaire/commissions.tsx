import { useState, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import { api } from "../../../lib/api";
import { COLORS } from "../../../lib/constants";

interface Commission {
  id: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
}

export default function CommissionsScreen() {
  const [commissions, setCommissions] = useState<Commission[]>([]);

  useEffect(() => {
    api
      .get<{ commissions: Commission[] }>("/partner/commissions")
      .then((d) => setCommissions(d.commissions ?? []))
      .catch(() => {});
  }, []);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      style={{ backgroundColor: COLORS.dark }}
    >
      {commissions.length === 0 && (
        <View style={{ alignItems: "center", padding: 40 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>💰</Text>
          <Text style={{ color: COLORS.gray, textAlign: "center" }}>
            Tes commissions apparaitront ici quand tes filleuls s'abonneront.
          </Text>
        </View>
      )}
      {commissions.map((c) => (
        <View
          key={c.id}
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            padding: 14,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text style={{ color: COLORS.white, fontWeight: "600" }}>{c.type}</Text>
            <Text style={{ color: COLORS.gray, fontSize: 12 }}>
              {new Date(c.created_at).toLocaleDateString("fr-FR")}
            </Text>
          </View>
          <Text style={{ color: COLORS.green, fontWeight: "700", fontSize: 16 }}>
            +{c.amount.toFixed(2)}€
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
