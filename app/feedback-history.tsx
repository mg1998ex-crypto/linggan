/**
 * 反馈历史页面
 * 显示用户之前提交过的所有反馈记录
 */

import { useState, useEffect, useCallback } from "react";
import {
  View, Text, Pressable, FlatList, StyleSheet, Platform,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { getFeedbackRecords, type FeedbackRecord } from "@/services/feedbackStorage";

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  bug: { label: "Bug 报告", icon: "bug-report" },
  feature: { label: "功能建议", icon: "lightbulb-outline" },
  other: { label: "其他", icon: "more-horiz" },
};

export default function FeedbackHistoryScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getFeedbackRecords();
      setRecords(data);
    } catch (e) {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const formatDate = (timestamp: string) => {
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");
    const minute = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
  };

  const renderItem = ({ item }: { item: FeedbackRecord }) => {
    const typeInfo = TYPE_LABELS[item.type] || TYPE_LABELS.other;
    return (
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: c.accentLight }]}>
            <MaterialIcons name={typeInfo.icon as keyof typeof MaterialIcons.glyphMap} size={14} color={c.primary} />
            <Text style={[styles.typeBadgeText, { color: c.accentDark }]}>{typeInfo.label}</Text>
          </View>
          <Text style={[styles.dateText, { color: c.muted }]}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={[styles.contentText, { color: c.foreground }]} numberOfLines={4}>
          {item.content}
        </Text>
        {item.contact ? (
          <Text style={[styles.contactText, { color: c.muted }]}>
            联系方式：{item.contact}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.container, { backgroundColor: c.background }]}>
        {/* 导航栏 */}
        <View style={styles.navbar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.5 }]}
            hitSlop={12}
          >
            <MaterialIcons name="arrow-back" size={24} color={c.foreground} />
          </Pressable>
          <Text style={[styles.navTitle, { color: c.foreground }]}>反馈记录</Text>
          <View style={{ width: 32 }} />
        </View>

        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="inbox" size={48} color={c.muted} />
                <Text style={[styles.emptyText, { color: c.muted }]}>暂无反馈记录</Text>
              </View>
            ) : null
          }
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navbar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
  },
  navButton: { padding: 4 },
  navTitle: { fontSize: 17, fontWeight: "600", letterSpacing: 1 },
  listContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  typeBadgeText: { fontSize: 12, fontWeight: "500" },
  dateText: { fontSize: 12 },
  contentText: { fontSize: 14, lineHeight: 22, letterSpacing: 0.3 },
  contactText: { fontSize: 12, marginTop: 8 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 },
  emptyText: { fontSize: 15, marginTop: 12 },
});
