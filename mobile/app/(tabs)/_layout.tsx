import { Tabs, Redirect } from "expo-router";
import { View, Text } from "react-native";
import { useAuthStore } from "../../stores/auth";
import { COLORS } from "../../lib/constants";

function TabIcon({
  name,
  focused,
  icon,
}: {
  name: string;
  focused: boolean;
  icon: string;
}) {
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text
        style={{
          fontSize: 10,
          color: focused ? COLORS.gold : COLORS.gray,
          fontWeight: focused ? "600" : "400",
        }}
      >
        {name}
      </Text>
      {focused && (
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: COLORS.gold,
          }}
        />
      )}
    </View>
  );
}

export default function TabLayout() {
  const { user, initialized } = useAuthStore();

  if (initialized && !user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.dark,
          borderTopColor: "rgba(255,255,255,0.06)",
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: COLORS.gray,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Dashboard" focused={focused} icon="📊" />
          ),
        }}
      />
      <Tabs.Screen
        name="trading"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Trading" focused={focused} icon="📈" />
          ),
        }}
      />
      <Tabs.Screen
        name="classement"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Classement" focused={focused} icon="🏆" />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Chat IA" focused={focused} icon="💬" />
          ),
        }}
      />
      <Tabs.Screen
        name="referral"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Parrainage" focused={focused} icon="👥" />
          ),
        }}
      />
    </Tabs>
  );
}
