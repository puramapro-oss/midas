import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "../../stores/auth";
import { COLORS } from "../../lib/constants";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signInWithEmail, loading } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Erreur", "Remplis ton email et ton mot de passe.");
      return;
    }
    try {
      await signInWithEmail(email.trim(), password);
      router.replace("/(tabs)");
    } catch (err) {
      Alert.alert(
        "Erreur de connexion",
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: COLORS.dark }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Text
          style={{
            fontFamily: "Orbitron",
            fontSize: 36,
            fontWeight: "800",
            color: COLORS.gold,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          MIDAS
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: COLORS.gray,
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          Trading IA intelligent
        </Text>

        <View style={{ gap: 16 }}>
          <TextInput
            testID="login-email"
            placeholder="Email"
            placeholderTextColor={COLORS.grayDark}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.06)",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              color: COLORS.white,
              fontSize: 16,
            }}
          />
          <TextInput
            testID="login-password"
            placeholder="Mot de passe"
            placeholderTextColor={COLORS.grayDark}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.06)",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              color: COLORS.white,
              fontSize: 16,
            }}
          />

          <TouchableOpacity
            testID="login-submit"
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.gold, COLORS.goldDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.dark} />
              ) : (
                <Text
                  style={{
                    color: COLORS.dark,
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                >
                  Se connecter
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 24,
            gap: 4,
          }}
        >
          <Text style={{ color: COLORS.gray }}>Pas encore de compte ?</Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={{ color: COLORS.gold, fontWeight: "600" }}>
                Inscription
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
