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

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signUp, loading } = useAuthStore();

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Erreur", "Remplis tous les champs.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit faire au moins 6 caracteres.");
      return;
    }
    try {
      await signUp(email.trim(), password, name.trim());
      Alert.alert(
        "Inscription reussie",
        "Ton compte a ete cree. Tu peux te connecter.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
      );
    } catch (err) {
      Alert.alert(
        "Erreur",
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
          Cree ton compte trader
        </Text>

        <View style={{ gap: 16 }}>
          <TextInput
            testID="register-name"
            placeholder="Nom complet"
            placeholderTextColor={COLORS.grayDark}
            value={name}
            onChangeText={setName}
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
            testID="register-email"
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
            testID="register-password"
            placeholder="Mot de passe (6+ caracteres)"
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
            testID="register-submit"
            onPress={handleRegister}
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
                  Creer mon compte
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
          <Text style={{ color: COLORS.gray }}>Deja un compte ?</Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={{ color: COLORS.gold, fontWeight: "600" }}>
                Connexion
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
