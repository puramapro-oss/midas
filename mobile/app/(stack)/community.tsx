import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { api } from "../../lib/api";
import { COLORS } from "../../lib/constants";

interface WallPost {
  id: string;
  content: string;
  type: string;
  reactions_count: number;
  full_name: string;
  created_at: string;
}

export default function CommunityScreen() {
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [newPost, setNewPost] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ posts: WallPost[] }>("/community/wall");
      setPosts(data.posts ?? []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitPost = async () => {
    if (!newPost.trim()) return;
    try {
      await api.post("/community/wall", {
        content: newPost.trim(),
        type: "encouragement",
      });
      setNewPost("");
      load();
    } catch {
      Alert.alert("Erreur", "Impossible de publier.");
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      style={{ backgroundColor: COLORS.dark }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.gold}
        />
      }
    >
      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: 12,
          padding: 14,
          gap: 10,
        }}
      >
        <TextInput
          testID="community-input"
          placeholder="Partage une victoire ou encourage un trader..."
          placeholderTextColor={COLORS.grayDark}
          value={newPost}
          onChangeText={setNewPost}
          multiline
          maxLength={500}
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 10,
            padding: 12,
            color: COLORS.white,
            fontSize: 15,
            minHeight: 60,
          }}
        />
        <TouchableOpacity
          testID="community-post"
          onPress={submitPost}
          disabled={!newPost.trim()}
          style={{
            backgroundColor: newPost.trim()
              ? COLORS.gold
              : "rgba(255,255,255,0.05)",
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: newPost.trim() ? COLORS.dark : COLORS.gray,
              fontWeight: "600",
            }}
          >
            Publier
          </Text>
        </TouchableOpacity>
      </View>

      {posts.map((p) => (
        <View
          key={p.id}
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
              marginBottom: 8,
            }}
          >
            <Text style={{ color: COLORS.white, fontWeight: "600" }}>
              {p.full_name}
            </Text>
            <Text style={{ color: COLORS.gray, fontSize: 12 }}>
              {new Date(p.created_at).toLocaleDateString("fr-FR")}
            </Text>
          </View>
          <Text style={{ color: COLORS.white, fontSize: 15, lineHeight: 22 }}>
            {p.content}
          </Text>
          <Text style={{ color: COLORS.gray, fontSize: 13, marginTop: 8 }}>
            ❤️ {p.reactions_count}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
