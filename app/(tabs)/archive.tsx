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
import { useInspirations, type LocalInspiration } from "@/lib/inspiration-context";
import { useThemeColors } from "@/hooks/use-theme-colors";

export default function ArchiveScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { inspirations, loading: isLoading, stats, deleteInspiration } = useInspirations();

  const handleCardPress = (id: number) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/inspiration-detail", params: { id: String(id) } });
  };

  const handleDelete = async (id: number, word1: string, word2: string, word3: string) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const confirmDelete = () => {
      deleteInspiration(id)
        .then(() => {
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        })
        .catch(() => {
          if (Platform.OS === "web") alert("删除失败,请重试");
          else Alert.alert("错误", "删除失败,请重试");
        });
    };
    if (Platform.OS === "web") {
      if (confirm(`确定删除这条灵感？\n${word1} · ${word2} · ${word3}`)) confirmDelete();
    } else {
      Alert.alert("删除灵感", `确定删除这条灵感？\n${word1} · ${word2} · ${word3}`, [
        { text: "取消", style: "cancel" },
        { text: "删除", style: "destructive", onPress: confirmDelete },
      ]);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const renderRightActions = (item: any) => (
    <Pressable onPress={() => handleDelete(item.id, item.word1, item.word2, item.word3)} style={[styles.deleteButton, { backgroundColor: c.error }]}>
      <Text style={styles.deleteButtonText}>删除</Text>
    </Pressable>
  );

  const renderHeader = () => (
    <View>
      {stats && (
        <View style={[styles.statsPanel, { backgroundColor: c.accentLight, borderColor: c.isDark ? c.border : "#F5D9A8" }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: c.primary }]}>{stats.total}</Text>
              <Text style={[styles.statLabel, { color: c.muted }]}>累计灵感</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: c.primary }]}>{stats.todayCount}</Text>
              <Text style={[styles.statLabel, { color: c.muted }]}>今日</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: c.primary }]}>{stats.weekCount}</Text>
              <Text style={[styles.statLabel, { color: c.muted }]}>本周</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: c.primary }]}>{stats.streakDays}</Text>
              <Text style={[styles.statLabel, { color: c.muted }]}>连续天</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: LocalInspiration }) => {
    const summary = item.content.length > 60 ? item.content.slice(0, 60) + "..." : item.content;
    return (
      <Swipeable renderRightActions={() => renderRightActions(item)} overshootRight={false}>
        <Pressable
          onPress={() => handleCardPress(item.id)}
          onLongPress={() => handleDelete(item.id, item.word1, item.word2, item.word3)}
          style={({ pressed }) => [styles.card, { backgroundColor: c.cardBg, borderColor: c.border }, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.wordsContainer}>
            <Text style={[styles.words, { color: c.accentDark }]}>{item.word1} · {item.word2} · {item.word3}</Text>
          </View>
          <Text style={[styles.content, { color: c.foreground }]} numberOfLines={2}>{summary}</Text>
          <View style={styles.cardFooter}>
            <Text style={[styles.date, { color: c.muted }]}>{formatDate(item.createdAt)}</Text>
            <Text style={[styles.viewHint, { color: c.primary }]}>查看详情 →</Text>
          </View>
        </Pressable>
      </Swipeable>
    );
  };

  return (
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.foreground }]}>灵感列表</Text>
        </View>
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: c.muted }]}>加载中...</Text>
          </View>
        ) : inspirations.length === 0 ? (
          <View style={styles.emptyContainer}>
            {renderHeader()}
            <Text style={[styles.emptyText, { color: c.muted }]}>还没有保存任何灵感</Text>
            <Text style={[styles.emptyHint, { color: c.muted }]}>去主页生成你的第一个灵感吧</Text>
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
  title: { fontSize: 32, fontWeight: "300", letterSpacing: 8 },
  statsPanel: { borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1 },
  statsRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  statItem: { alignItems: "center", flex: 1 },
  statNumber: { fontSize: 28, fontWeight: "300", letterSpacing: 1 },
  statLabel: { fontSize: 12, marginTop: 4, letterSpacing: 1 },
  statDivider: { width: 1, height: 32 },
  listContent: { paddingBottom: 40 },
  card: { borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1 },
  wordsContainer: { marginBottom: 12 },
  words: { fontSize: 18, fontWeight: "600", letterSpacing: 1 },
  content: { fontSize: 16, lineHeight: 24, marginBottom: 12 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { fontSize: 12 },
  viewHint: { fontSize: 12, letterSpacing: 0.5 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyText: { fontSize: 18, marginBottom: 12 },
  emptyHint: { fontSize: 14 },
  deleteButton: { justifyContent: "center", alignItems: "center", width: 80, borderRadius: 12, marginBottom: 16 },
  deleteButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "500" },
});
