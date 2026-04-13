import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuthStore } from "../stores/auth";
import { COLORS } from "../lib/constants";

export default function Index() {
  const { user, loading, initialized } = useAuthStore();

  if (!initialized || loading) {
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
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
