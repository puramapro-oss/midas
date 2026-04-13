import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import { useAuthStore } from "../../stores/auth";
import { api } from "../../lib/api";
import { COLORS } from "../../lib/constants";
import type { WalletTransaction } from "../../lib/types";

interface ReferralStats {
  referral_code: string;
  total_referrals: number;
  active_referrals: number;
  total_earned: number;
  tier: string;
  wallet_balance: number;
}

export default function ReferralScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [refData, walletData] = await Promise.all([
        api.get<ReferralStats>("/referral/track"),
        api
          .get<{ transactions: WalletTransaction[] }>("/wallet")
          .catch(() => ({ transactions: [] })),
      ]);
      setStats(refData);
      setTransactions(walletData.transactions?.slice(0, 10) ?? []);
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

  const copyCode = async () => {
    const code = stats?.referral_code ?? profile?.referral_code;
    if (code) {
      await Clipboard.setStringAsync(code);
      Alert.alert("Copie !", "Code de parrainage copie dans le presse-papier.");
    }
  };

  const shareReferral = async () => {
    const code = stats?.referral_code ?? profile?.referral_code;
    if (!code) return;
    try {
      await Share.share({
        message: `Rejoins MIDAS, la plateforme de trading IA ! Utilise mon code ${code} pour commencer : https://midas.purama.dev/share/${code}`,
      });
    } catch {
      // cancelled
    }
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
          Parrainage & Wallet
        </Text>

        {/* Wallet Card */}
        <LinearGradient
          colors={["rgba(245,158,11,0.15)", "rgba(124,58,237,0.1)"]}
          style={{ borderRadius: 16, padding: 20 }}
        >
          <Text style={{ color: COLORS.gray, fontSize: 14 }}>
            Solde wallet
          </Text>
          <Text
            style={{
              color: COLORS.gold,
              fontSize: 36,
              fontWeight: "800",
              marginTop: 4,
            }}
          >
            {(stats?.wallet_balance ?? profile?.wallet_balance ?? 0).toFixed(2)}€
          </Text>
          <View
            style={{
              flexDirection: "row",
              marginTop: 16,
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                Filleuls
              </Text>
              <Text
                style={{
                  color: COLORS.white,
                  fontSize: 20,
                  fontWeight: "700",
                }}
              >
                {stats?.total_referrals ?? 0}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>Gagne</Text>
              <Text
                style={{
                  color: COLORS.green,
                  fontSize: 20,
                  fontWeight: "700",
                }}
              >
                {(stats?.total_earned ?? 0).toFixed(2)}€
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>Palier</Text>
              <Text
                style={{
                  color: COLORS.gold,
                  fontSize: 20,
                  fontWeight: "700",
                }}
              >
                {(stats?.tier ?? profile?.tier ?? "bronze")
                  .charAt(0)
                  .toUpperCase() +
                  (stats?.tier ?? profile?.tier ?? "bronze").slice(1)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Referral Code */}
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            padding: 16,
            gap: 12,
          }}
        >
          <Text
            style={{
              color: COLORS.white,
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            Ton code parrainage
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: 10,
                padding: 14,
              }}
            >
              <Text
                style={{
                  color: COLORS.gold,
                  fontSize: 20,
                  fontWeight: "700",
                  textAlign: "center",
                  letterSpacing: 2,
                }}
              >
                {stats?.referral_code ?? profile?.referral_code ?? "---"}
              </Text>
            </View>
            <TouchableOpacity
              testID="copy-code"
              onPress={copyCode}
              style={{
                backgroundColor: "rgba(245,158,11,0.2)",
                borderRadius: 10,
                padding: 14,
              }}
            >
              <Text style={{ fontSize: 18 }}>📋</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            testID="share-referral"
            onPress={shareReferral}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.gold, COLORS.goldDark]}
              style={{
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: COLORS.dark,
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                Partager mon lien
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        {transactions.length > 0 && (
          <View>
            <Text
              style={{
                color: COLORS.white,
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 12,
              }}
            >
              Historique wallet
            </Text>
            {transactions.map((t) => (
              <View
                key={t.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255,255,255,0.06)",
                }}
              >
                <View>
                  <Text
                    style={{
                      color: COLORS.white,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    {t.description}
                  </Text>
                  <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                    {new Date(t.created_at).toLocaleDateString("fr-FR")}
                  </Text>
                </View>
                <Text
                  style={{
                    color: t.amount >= 0 ? COLORS.green : COLORS.red,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {t.amount >= 0 ? "+" : ""}
                  {t.amount.toFixed(2)}€
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
