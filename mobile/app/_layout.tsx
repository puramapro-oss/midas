import "../global.css";
import { useEffect } from "react";
import { Redirect, Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../stores/auth";
import { COLORS } from "../lib/constants";

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const pathname = usePathname();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const disabledPrefixes = [
    "/trading",
    "/classement",
    "/referral",
    "/analysis/",
    "/settings/exchanges",
    "/achievements",
    "/boutique",
    "/lottery",
    "/partenaire",
    "/earn",
    "/bots",
    "/agents",
    "/tax",
    "/guide",
    "/contest",
    "/help/connect-binance",
  ];

  if (disabledPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <>
      <StatusBar style="light" backgroundColor={COLORS.dark} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.dark },
          animation: "slide_from_right",
        }}
      />
    </>
  );
}
