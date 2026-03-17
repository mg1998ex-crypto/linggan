/**
 * 灵感列表页面
 * 展示所有已保存的灵感记录
 * 点击卡片进入详情页查看/编辑
 */

import { View, Text, FlatList, Pressable, StyleSheet, Platform, Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { Swipeable } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

export default function ArchiveScreen() {
  const router = useRouter();
  const { data: inspirations = [], isLoading, refetch } = trpc.inspirations.list.useQuery();
  const deleteInspiration = trpc.inspirations.delete.useMutation();

  const handleCardPress = (id: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: "/inspiration-detail", params: { id: String(id) } });
  };

  const handleDelete = async (id: number, word1: string, word2: string, word3: string) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    const confirmDelete = () => {
      deleteInspiration.mutate({ id }, {
        onSuccess: () => {
          refetch();
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
        onError: (error) => {
          console.error("删除失败:", error);
          if (Platform.OS === "web") {
            alert("删除失败,请重试");
          } else {
            Alert.alert("错误", "删除失败,请重试");
          }
        },
      });
    };

    if (Platform.OS === "web") {
      if (confirm(`确定删除这条灵感？\n${word1} · ${word2} · ${word3}`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        "删除灵感",
        `确定删除这条灵感？\n${word1} · ${word2} · ${word3}`,
        [
          { text: "取消", style: "cancel" },
          { text: "删除", style: "destructive", onPress: confirmDelete },
        ]
      );
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const renderRightActions = (item: any) => {
    return (
      <Pressable
        onPress={() => handleDelete(item.id, item.word1, item.word2, item.word3)}
        style={styles.deleteButton}
      >
        <Text style={styles.deleteButtonText}>删除</Text>
      </Pressable>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const summary = item.content.length > 60 ? item.content.slice(0, 60) + "..." : item.content;

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
      >
        <Pressable
          onPress={() => handleCardPress(item.id)}
          onLongPress={() => handleDelete(item.id, item.word1, item.word2, item.word3)}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <View style={styles.wordsContainer}>
            <Text style={styles.words}>
              {item.word1} · {item.word2} · {item.word3}
            </Text>
          </View>

          <Text style={styles.content} numberOfLines={2}>
            {summary}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            <Text style={styles.viewHint}>查看详情 →</Text>
          </View>
        </Pressable>
      </Swipeable>
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
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 12,
    color: "#8A8A8A",
  },
  viewHint: {
    fontSize: 12,
    color: "#AFAFAF",
    letterSpacing: 0.5,
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
  deleteButton: {
    backgroundColor: "#C9A87C",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 12,
    marginBottom: 16,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
});
