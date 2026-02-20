/**
 * 灵感列表页面
 * 展示所有已保存的灵感记录
 */

import { useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

export default function ArchiveScreen() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: inspirations = [], isLoading, refetch } = trpc.inspirations.list.useQuery();

  const handleCardPress = (id: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedId(selectedId === id ? null : id);
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const renderItem = ({ item }: { item: any }) => {
    const isExpanded = selectedId === item.id;
    const summary = item.content.length > 50 ? item.content.slice(0, 50) + "..." : item.content;

    return (
      <Pressable
        onPress={() => handleCardPress(item.id)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.wordsContainer}>
          <Text style={styles.words}>
            {item.word1} · {item.word2} · {item.word3}
          </Text>
        </View>

        <Text style={styles.content} numberOfLines={isExpanded ? undefined : 2}>
          {isExpanded ? item.content : summary}
        </Text>

        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </Pressable>
    );
  };

  return (
    <ScreenContainer className="bg-background">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>灵感列表</Text>
        </View>

        {isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>加载中...</Text>
          </View>
        ) : inspirations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>还没有保存任何灵感</Text>
            <Text style={styles.emptyHint}>去主页生成你的第一个灵感吧</Text>
          </View>
        ) : (
          <FlatList
            data={inspirations}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  header: {
    alignItems: "center",
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: "300",
    color: "#2C2C2C",
    letterSpacing: 8,
  },
  listContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardPressed: {
    opacity: 0.7,
  },
  wordsContainer: {
    marginBottom: 12,
  },
  words: {
    fontSize: 18,
    fontWeight: "600",
    color: "#5A6C7D",
    letterSpacing: 1,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: "#2C2C2C",
    marginBottom: 12,
  },
  date: {
    fontSize: 12,
    color: "#8A8A8A",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: "#8A8A8A",
    marginBottom: 12,
  },
  emptyHint: {
    fontSize: 14,
    color: "#AFAFAF",
  },
});
