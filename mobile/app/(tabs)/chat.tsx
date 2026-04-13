import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { COLORS } from "../../lib/constants";
import type { ChatMessage } from "../../lib/types";

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Salut trader ! Je suis ton assistant MIDAS. Pose-moi tes questions sur le marche, les strategies ou l'analyse technique.",
      created_at: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await api.post<{ message: string }>("/chat", {
        message: userMsg.content,
      });
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Desole, je n'ai pas pu repondre. Verifie ta connexion et reessaie.",
          created_at: new Date().toISOString(),
        },
      ]);
    }
    setLoading(false);
  }, [input, loading]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.dark }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.06)",
        }}
      >
        <Text
          style={{
            color: COLORS.white,
            fontSize: 20,
            fontWeight: "800",
          }}
        >
          Chat MIDAS
        </Text>
        <Text style={{ color: COLORS.gray, fontSize: 13 }}>
          Ton assistant trading IA
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        renderItem={({ item }) => (
          <View
            style={{
              alignSelf:
                item.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "80%",
              backgroundColor:
                item.role === "user"
                  ? "rgba(245,158,11,0.15)"
                  : "rgba(255,255,255,0.05)",
              borderRadius: 16,
              borderBottomRightRadius: item.role === "user" ? 4 : 16,
              borderBottomLeftRadius: item.role === "assistant" ? 4 : 16,
              padding: 14,
            }}
          >
            <Text
              style={{
                color: COLORS.white,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {item.content}
            </Text>
          </View>
        )}
      />

      {loading && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <ActivityIndicator color={COLORS.gold} size="small" />
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <View
          style={{
            flexDirection: "row",
            padding: 12,
            gap: 8,
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.06)",
          }}
        >
          <TextInput
            testID="chat-input"
            value={input}
            onChangeText={setInput}
            placeholder="Pose ta question..."
            placeholderTextColor={COLORS.grayDark}
            multiline
            maxLength={2000}
            style={{
              flex: 1,
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              color: COLORS.white,
              fontSize: 15,
              maxHeight: 100,
            }}
          />
          <TouchableOpacity
            testID="chat-send"
            onPress={sendMessage}
            disabled={!input.trim() || loading}
            style={{
              backgroundColor:
                input.trim() && !loading
                  ? COLORS.gold
                  : "rgba(255,255,255,0.05)",
              borderRadius: 20,
              width: 44,
              height: 44,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 18 }}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
