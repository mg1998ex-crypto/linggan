/**
 * 灵感列表页面
 * 顶部显示灵感统计面板,下方展示所有已保存的灵感记录
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
  const { data: stats } = trpc.inspirations.stats.useQuery();
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
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${month}-${day}`;
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

  const renderHeader = () => (
    <View>
      {/* 统计面板 */}
      {stats && (
        <View style={styles.statsPanel}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>累计灵感</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.todayCount}</Text>
              <Text style={styles.statLabel}>今日</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.weekCount}</Text>
              <Text style={styles.statLabel}>本周</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.streakDays}</Text>
              <Text style={styles.statLabel}>连续天</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

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
            {renderHeader()}
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
            ListHeaderComponent={renderHeader}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
  header: { alignItems: "center", marginBottom: 24 },
  title: { fontSize: 32, fontWeight: "300", color: "#2D2D2D", letterSpacing: 8 },

  /* 统计面板 - 暖阳主题 */
  statsPanel: {
    backgroundColor: "#FFF8EE", borderRadius: 16, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: "#F5D9A8",
  },
  statsRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  statItem: { alignItems: "center", flex: 1 },
  statNumber: { fontSize: 28, fontWeight: "300", color: "#F5A623", letterSpacing: 1 },
  statLabel: { fontSize: 12, color: "#8E8E93", marginTop: 4, letterSpacing: 1 },
  statDivider: { width: 1, height: 32, backgroundColor: "#F0EDE8" },

  listContent: { paddingBottom: 40 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: "#F0EDE8",
  },
  cardPressed: { opacity: 0.7 },
  wordsContainer: { marginBottom: 12 },
  words: { fontSize: 18, fontWeight: "600", color: "#C48A1A", letterSpacing: 1 },
  content: { fontSize: 16, lineHeight: 24, color: "#2D2D2D", marginBottom: 12 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { fontSize: 12, color: "#8E8E93" },
  viewHint: { fontSize: 12, color: "#F5A623", letterSpacing: 0.5 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyText: { fontSize: 18, color: "#8E8E93", marginBottom: 12 },
  emptyHint: { fontSize: 14, color: "#B0B0B5" },
  deleteButton: {
    backgroundColor: "#E74C3C", justifyContent: "center", alignItems: "center",
    width: 80, borderRadius: 12, marginBottom: 16,
  },
  deleteButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "500" },
});
