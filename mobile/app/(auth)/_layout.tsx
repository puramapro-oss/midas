import { Stack } from "expo-router";
import { COLORS } from "../../lib/constants";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.dark },
        animation: "slide_from_bottom",
      }}
    />
  );
}
