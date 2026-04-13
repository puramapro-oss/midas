import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../stores/auth";
import { COLORS } from "../../lib/constants";

export default function SettingsScreen() {
  const { profile, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert("Deconnexion", "Es-tu sur de vouloir te deconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Deconnecter",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const sections = [
    {
      title: "Compte",
      items: [
        {
          label: "Exchanges",
          icon: "🔗",
          route: "/(stack)/settings/exchanges",
        },
        { label: "Achievements", icon: "🏆", route: "/(stack)/achievements" },
        { label: "Fiscalite", icon: "📋", route: "/(stack)/tax" },
      ],
    },
    {
      title: "Trading",
      items: [
        { label: "Alertes", icon: "🔔", route: "/(stack)/alerts" },
        { label: "Agents IA", icon: "🤖", route: "/(stack)/agents" },
        { label: "Bots", icon: "⚙️", route: "/(stack)/bots" },
      ],
    },
    {
      title: "Communaute",
      items: [
        { label: "Communaute", icon: "❤️", route: "/(stack)/community" },
        { label: "Concours", icon: "🎯", route: "/(stack)/contest" },
        { label: "Tirage", icon: "🎰", route: "/(stack)/lottery" },
        { label: "Partenaire", icon: "🤝", route: "/(stack)/partenaire" },
      ],
    },
    {
      title: "Aide",
      items: [
        { label: "Guide", icon: "📖", route: "/(stack)/guide" },
        { label: "FAQ", icon: "❓", route: "/(stack)/help/faq" },
        { label: "Aide", icon: "💡", route: "/(stack)/help" },
      ],
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 20 }}
      style={{ backgroundColor: COLORS.dark }}
    >
      {/* Profile Card */}
      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: 16,
          padding: 20,
          alignItems: "center",
          gap: 8,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "rgba(245,158,11,0.2)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 28 }}>
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? "M"}
          </Text>
        </View>
        <Text
          style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}
        >
          {profile?.full_name ?? "Trader"}
        </Text>
        <Text style={{ color: COLORS.gray, fontSize: 14 }}>
          {profile?.email}
        </Text>
        <View
          style={{
            backgroundColor: "rgba(245,158,11,0.2)",
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 12,
          }}
        >
          <Text
            style={{ color: COLORS.gold, fontWeight: "600", fontSize: 13 }}
          >
            {(profile?.plan ?? "free").toUpperCase()} -{" "}
            {(profile?.tier ?? "bronze").charAt(0).toUpperCase() +
              (profile?.tier ?? "bronze").slice(1)}
          </Text>
        </View>
      </View>

      {/* Sections */}
      {sections.map((section) => (
        <View key={section.title}>
          <Text
            style={{
              color: COLORS.gray,
              fontSize: 13,
              fontWeight: "600",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {section.title}
          </Text>
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {section.items.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                testID={`settings-${item.label.toLowerCase()}`}
                onPress={() => router.push(item.route as never)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 14,
                  borderBottomWidth:
                    i < section.items.length - 1 ? 1 : 0,
                  borderBottomColor: "rgba(255,255,255,0.06)",
                }}
              >
                <Text style={{ fontSize: 18, marginRight: 12 }}>
                  {item.icon}
                </Text>
                <Text
                  style={{
                    color: COLORS.white,
                    fontSize: 16,
                    flex: 1,
                  }}
                >
                  {item.label}
                </Text>
                <Text style={{ color: COLORS.gray }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Sign Out */}
      <TouchableOpacity
        testID="sign-out"
        onPress={handleSignOut}
        style={{
          backgroundColor: "rgba(239,68,68,0.1)",
          borderRadius: 12,
          padding: 16,
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <Text style={{ color: COLORS.red, fontSize: 16, fontWeight: "600" }}>
          Se deconnecter
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
