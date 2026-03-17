/**
 * 灵感详情页面
 * 查看、编辑、删除灵感记录
 */

import { useState, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  Platform, Alert, ActivityIndicator, Keyboard,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

export default function InspirationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const inspirationId = Number(id);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: inspiration, isLoading, refetch } = trpc.inspirations.getById.useQuery(
    { id: inspirationId },
    { enabled: !!inspirationId }
  );
  const updateInspiration = trpc.inspirations.update.useMutation();
  const deleteInspiration = trpc.inspirations.delete.useMutation();

  useEffect(() => {
    if (inspiration) {
      setEditContent(inspiration.content);
    }
  }, [inspiration]);

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");
    const minute = String(d.getMinutes()).padStart(2, "0");
    return `${year}年${month}月${day}日 ${hour}:${minute}`;
  };

  const handleStartEdit = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    Keyboard.dismiss();
    setEditContent(inspiration?.content || "");
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Keyboard.dismiss();

    try {
      await updateInspiration.mutateAsync({
        id: inspirationId,
        content: editContent.trim(),
      });
      setIsEditing(false);
      refetch();

      if (Platform.OS === "web") {
        // Web端简单提示
      } else {
        Alert.alert("", "修改已保存");
      }
    } catch (e) {
      console.error("更新失败:", e);
      const msg = "保存失败,请重试";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("错误", msg);
    }
  };

  const handleDelete = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    const confirmDelete = async () => {
      try {
        await deleteInspiration.mutateAsync({ id: inspirationId });
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.back();
      } catch (e) {
        console.error("删除失败:", e);
        const msg = "删除失败,请重试";
        if (Platform.OS === "web") alert(msg);
        else Alert.alert("错误", msg);
      }
    };

    if (Platform.OS === "web") {
      if (confirm("确定删除这条灵感记录？删除后不可恢复。")) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        "删除灵感",
        "确定删除这条灵感记录？删除后不可恢复。",
        [
          { text: "取消", style: "cancel" },
          { text: "删除", style: "destructive", onPress: confirmDelete },
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#8A8A8A" />
        </View>
      </ScreenContainer>
    );
  }

  if (!inspiration) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>灵感记录不存在</Text>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>返回列表</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* 顶部导航栏 */}
        <View style={styles.navbar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.5 }]}
            hitSlop={12}
          >
            <MaterialIcons name="arrow-back" size={24} color="#2C2C2C" />
          </Pressable>

          <View style={styles.navActions}>
            {!isEditing ? (
              <>
                <Pressable
                  onPress={handleStartEdit}
                  style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.5 }]}
                  hitSlop={12}
                >
                  <MaterialIcons name="edit" size={22} color="#2C2C2C" />
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  style={({ pressed }) => [styles.navButton, { marginLeft: 16 }, pressed && { opacity: 0.5 }]}
                  hitSlop={12}
                >
                  <MaterialIcons name="delete-outline" size={22} color="#C9A87C" />
                </Pressable>
              </>
            ) : null}
          </View>
        </View>

        {/* 三个原词 */}
        <View style={styles.wordsSection}>
          <View style={styles.wordsRow}>
            <Text style={styles.wordText}>{inspiration.word1}</Text>
            <Text style={styles.wordDot}>·</Text>
            <Text style={styles.wordText}>{inspiration.word2}</Text>
            <Text style={styles.wordDot}>·</Text>
            <Text style={styles.wordText}>{inspiration.word3}</Text>
          </View>
        </View>

        {/* 分隔线 */}
        <View style={styles.divider} />

        {/* 灵感内容 */}
        <View style={styles.contentSection}>
          {isEditing ? (
            <>
              <TextInput
                style={styles.editInput}
                multiline
                value={editContent}
                onChangeText={setEditContent}
                autoFocus
                placeholder="编辑灵感内容..."
                placeholderTextColor="#BDBDBD"
              />
              <View style={styles.editActions}>
                <Pressable
                  onPress={handleCancelEdit}
                  style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.cancelButtonText}>取消</Text>
                </Pressable>
                <Pressable
                  onPress={editContent.trim() ? handleSaveEdit : undefined}
                  disabled={!editContent.trim()}
                  style={({ pressed }) => [
                    styles.saveEditButton,
                    !editContent.trim() && styles.saveEditButtonDisabled,
                    pressed && editContent.trim() && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[
                    styles.saveEditButtonText,
                    !editContent.trim() && styles.saveEditButtonTextDisabled,
                  ]}>
                    保存修改
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Text style={styles.contentText}>{inspiration.content}</Text>
          )}
        </View>

        {/* 时间信息 */}
        {!isEditing && (
          <View style={styles.metaSection}>
            <Text style={styles.metaText}>{formatDate(inspiration.createdAt)}</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16, color: "#8A8A8A", marginBottom: 16 },
  backLink: { paddingVertical: 8, paddingHorizontal: 16 },
  backLinkText: { fontSize: 15, color: "#5A5A5A", textDecorationLine: "underline" },

  /* 导航栏 */
  navbar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 12, paddingBottom: 20,
  },
  navButton: { padding: 4 },
  navActions: { flexDirection: "row", alignItems: "center" },

  /* 三个原词 */
  wordsSection: { alignItems: "center", paddingVertical: 32 },
  wordsRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center" },
  wordText: { fontSize: 22, fontWeight: "700", color: "#2C2C2C", letterSpacing: 2 },
  wordDot: { fontSize: 18, color: "#BDBDBD", marginHorizontal: 12 },

  /* 分隔线 */
  divider: { height: 1, backgroundColor: "#F0F0F0", marginHorizontal: 20, marginBottom: 32 },

  /* 灵感内容 */
  contentSection: { flex: 1, minHeight: 200 },
  contentText: { fontSize: 17, lineHeight: 28, color: "#2C2C2C", letterSpacing: 0.5 },

  /* 编辑模式 */
  editInput: {
    fontSize: 17, lineHeight: 28, color: "#2C2C2C", letterSpacing: 0.5,
    backgroundColor: "#FAFAFA", borderRadius: 12, padding: 20,
    minHeight: 200, textAlignVertical: "top",
    borderWidth: 1, borderColor: "#F0F0F0",
  },
  editActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, gap: 16 },
  cancelButton: {
    flex: 1, paddingVertical: 14, backgroundColor: "#FFFFFF", borderRadius: 28,
    alignItems: "center", borderWidth: 1, borderColor: "#E0E0E0",
  },
  cancelButtonText: { fontSize: 15, color: "#5A5A5A", letterSpacing: 1 },
  saveEditButton: {
    flex: 1, paddingVertical: 14, backgroundColor: "#2C2C2C", borderRadius: 28,
    alignItems: "center",
  },
  saveEditButtonText: { fontSize: 15, color: "#FFFFFF", fontWeight: "500", letterSpacing: 1 },
  saveEditButtonDisabled: { backgroundColor: "#E0E0E0" },
  saveEditButtonTextDisabled: { color: "#BDBDBD" },

  /* 时间信息 */
  metaSection: { marginTop: 40, paddingTop: 20, borderTopWidth: 1, borderTopColor: "#F0F0F0" },
  metaText: { fontSize: 13, color: "#AFAFAF", letterSpacing: 1 },
});
