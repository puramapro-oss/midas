import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { api } from "../../../lib/api";
import { COLORS } from "../../../lib/constants";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export default function FaqScreen() {
  const [articles, setArticles] = useState<FaqItem[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ articles: FaqItem[] }>("/faq");
      setArticles(data.articles ?? []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = articles.filter(
    (a) =>
      a.question.toLowerCase().includes(search.toLowerCase()) ||
      a.answer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      style={{ backgroundColor: COLORS.dark }}
    >
      <TextInput
        placeholder="Rechercher..."
        placeholderTextColor={COLORS.grayDark}
        value={search}
        onChangeText={setSearch}
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          color: COLORS.white,
          fontSize: 15,
        }}
      />

      {filtered.map((a) => (
        <TouchableOpacity
          key={a.id}
          onPress={() => setExpanded(expanded === a.id ? null : a.id)}
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: COLORS.white,
                fontSize: 15,
                fontWeight: "600",
                flex: 1,
              }}
            >
              {a.question}
            </Text>
            <Text style={{ color: COLORS.gray, fontSize: 18 }}>
              {expanded === a.id ? "−" : "+"}
            </Text>
          </View>
          {expanded === a.id && (
            <Text
              style={{
                color: COLORS.gray,
                fontSize: 14,
                lineHeight: 20,
                marginTop: 10,
              }}
            >
              {a.answer}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
