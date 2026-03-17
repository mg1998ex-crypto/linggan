/**
 * 灵感详情页面
 * 查看、编辑、删除、分享灵感记录
 */

import { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  Platform, Alert, ActivityIndicator, Keyboard, Modal, Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

const SCREEN_WIDTH = Dimensions.get("window").width;

// 动态导入分享相关库（Web端不可用）
let ViewShot: any = null;
let captureRef: any = null;
let Sharing: any = null;
let MediaLibrary: any = null;

if (Platform.OS !== "web") {
  try {
    const viewShotModule = require("react-native-view-shot");
    ViewShot = viewShotModule.default;
    captureRef = viewShotModule.captureRef;
  } catch (e) { /* not available */ }
  try { Sharing = require("expo-sharing"); } catch (e) { /* not available */ }
  try { MediaLibrary = require("expo-media-library"); } catch (e) { /* not available */ }
}

export default function InspirationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const inspirationId = Number(id);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [showShareCard, setShowShareCard] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const shareCardRef = useRef<any>(null);

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

  const formatShareDate = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
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

      if (Platform.OS !== "web") {
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

  const handleShare = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowShareCard(true);
  };

  const handleShareCapture = async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      if (Platform.OS === "web") {
        // Web端：复制文字到剪贴板
        if (inspiration) {
          const text = `${inspiration.word1} · ${inspiration.word2} · ${inspiration.word3}\n\n${inspiration.content}\n\n— 灵感 ${formatShareDate(inspiration.createdAt)}`;
          await navigator.clipboard.writeText(text);
          alert("灵感内容已复制到剪贴板");
        }
        setShowShareCard(false);
        setIsSharing(false);
        return;
      }

      // 原生端：截图分享
      if (!captureRef || !shareCardRef.current) {
        Alert.alert("提示", "分享功能暂不可用");
        setIsSharing(false);
        return;
      }

      // 等待渲染完成
      await new Promise(resolve => setTimeout(resolve, 300));

      const uri = await captureRef(shareCardRef.current, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      // 尝试使用系统分享
      if (Sharing && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "分享灵感",
        });
      } else if (MediaLibrary) {
        // 备选：保存到相册
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === "granted") {
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert("", "图片已保存到相册");
        } else {
          Alert.alert("提示", "需要相册权限才能保存图片");
        }
      } else {
        Alert.alert("提示", "分享功能暂不可用");
      }
    } catch (e) {
      console.error("分享失败:", e);
      if (Platform.OS === "web") {
        alert("分享失败,请重试");
      } else {
        Alert.alert("提示", "分享失败,请重试");
      }
    } finally {
      setShowShareCard(false);
      setIsSharing(false);
    }
  };

  const handleSaveToAlbum = async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      if (Platform.OS === "web" || !captureRef || !shareCardRef.current) {
        setIsSharing(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      const uri = await captureRef(shareCardRef.current, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      if (MediaLibrary) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === "granted") {
          await MediaLibrary.saveToLibraryAsync(uri);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("", "图片已保存到相册");
        } else {
          Alert.alert("提示", "需要相册权限才能保存图片");
        }
      }
    } catch (e) {
      console.error("保存失败:", e);
      Alert.alert("提示", "保存失败,请重试");
    } finally {
      setShowShareCard(false);
      setIsSharing(false);
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

  // 分享卡片内容（用于截图）
  const ShareCardContent = () => (
    <View style={shareStyles.card}>
      {/* 顶部三个词 */}
      <View style={shareStyles.wordsSection}>
        <Text style={shareStyles.word1}>{inspiration.word1}</Text>
        <Text style={shareStyles.wordDot}>·</Text>
        <Text style={shareStyles.word2}>{inspiration.word2}</Text>
        <Text style={shareStyles.wordDot}>·</Text>
        <Text style={shareStyles.word3}>{inspiration.word3}</Text>
      </View>

      {/* 分隔线 */}
      <View style={shareStyles.divider} />

      {/* 灵感正文 */}
      <Text style={shareStyles.content}>{inspiration.content}</Text>

      {/* 底部 */}
      <View style={shareStyles.footer}>
        <Text style={shareStyles.date}>{formatShareDate(inspiration.createdAt)}</Text>
        <Text style={shareStyles.brand}>灵感</Text>
      </View>
    </View>
  );

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
                  onPress={handleShare}
                  style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.5 }]}
                  hitSlop={12}
                >
                  <MaterialIcons name="ios-share" size={22} color="#2C2C2C" />
                </Pressable>
                <Pressable
                  onPress={handleStartEdit}
                  style={({ pressed }) => [styles.navButton, { marginLeft: 16 }, pressed && { opacity: 0.5 }]}
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

      {/* 分享卡片弹窗 */}
      <Modal
        visible={showShareCard}
        transparent
        animationType="fade"
        onRequestClose={() => !isSharing && setShowShareCard(false)}
      >
        <View style={shareStyles.overlay}>
          <View style={shareStyles.modalContent}>
            {/* 可截图的卡片区域 */}
            {Platform.OS !== "web" && ViewShot ? (
              <ViewShot ref={shareCardRef} options={{ format: "png", quality: 1 }}>
                <ShareCardContent />
              </ViewShot>
            ) : (
              <ShareCardContent />
            )}

            {/* 操作按钮 */}
            <View style={shareStyles.actions}>
              {Platform.OS !== "web" ? (
                <>
                  <Pressable
                    onPress={handleShareCapture}
                    disabled={isSharing}
                    style={({ pressed }) => [
                      shareStyles.shareButton,
                      isSharing && { opacity: 0.5 },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <MaterialIcons name="share" size={18} color="#FFFFFF" />
                    <Text style={shareStyles.shareButtonText}>
                      {isSharing ? "处理中..." : "分享"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveToAlbum}
                    disabled={isSharing}
                    style={({ pressed }) => [
                      shareStyles.saveButton,
                      isSharing && { opacity: 0.5 },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <MaterialIcons name="save-alt" size={18} color="#2C2C2C" />
                    <Text style={shareStyles.saveButtonText}>
                      {isSharing ? "处理中..." : "保存图片"}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={handleShareCapture}
                  disabled={isSharing}
                  style={({ pressed }) => [
                    shareStyles.shareButton, { flex: 1 },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <MaterialIcons name="content-copy" size={18} color="#FFFFFF" />
                  <Text style={shareStyles.shareButtonText}>复制文字</Text>
                </Pressable>
              )}
            </View>

            {/* 关闭按钮 */}
            <Pressable
              onPress={() => !isSharing && setShowShareCard(false)}
              style={({ pressed }) => [shareStyles.closeButton, pressed && { opacity: 0.5 }]}
            >
              <Text style={shareStyles.closeButtonText}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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

/* 分享卡片样式 */
const CARD_WIDTH = SCREEN_WIDTH - 64;

const shareStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", padding: 32,
  },
  modalContent: { width: CARD_WIDTH + 32, alignItems: "center" },

  /* 卡片 */
  card: {
    width: CARD_WIDTH, backgroundColor: "#FFFFFF", borderRadius: 20,
    padding: 32, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  wordsSection: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    flexWrap: "wrap", marginBottom: 24,
  },
  word1: { fontSize: 20, fontWeight: "700", color: "#2C2C2C", letterSpacing: 2 },
  word2: { fontSize: 20, fontWeight: "700", color: "#2C2C2C", letterSpacing: 2 },
  word3: { fontSize: 20, fontWeight: "700", color: "#2C2C2C", letterSpacing: 2 },
  wordDot: { fontSize: 16, color: "#BDBDBD", marginHorizontal: 10 },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginBottom: 24 },
  content: {
    fontSize: 16, lineHeight: 26, color: "#2C2C2C", letterSpacing: 0.3,
    marginBottom: 28, textAlign: "left",
  },
  footer: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderTopWidth: 1, borderTopColor: "#F0F0F0", paddingTop: 16,
  },
  date: { fontSize: 12, color: "#AFAFAF", letterSpacing: 1 },
  brand: { fontSize: 14, color: "#BDBDBD", letterSpacing: 4, fontWeight: "300" },

  /* 操作按钮 */
  actions: {
    flexDirection: "row", marginTop: 20, gap: 12, width: CARD_WIDTH,
  },
  shareButton: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#2C2C2C", borderRadius: 28, paddingVertical: 14, gap: 8,
  },
  shareButtonText: { fontSize: 15, color: "#FFFFFF", fontWeight: "500", letterSpacing: 1 },
  saveButton: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFFFFF", borderRadius: 28, paddingVertical: 14, gap: 8,
    borderWidth: 1, borderColor: "#E0E0E0",
  },
  saveButtonText: { fontSize: 15, color: "#2C2C2C", fontWeight: "500", letterSpacing: 1 },
  closeButton: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 32 },
  closeButtonText: { fontSize: 15, color: "#FFFFFF", letterSpacing: 1 },
});
