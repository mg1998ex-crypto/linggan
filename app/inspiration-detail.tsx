/**
 * 灵感详情页面
 * 查看、编辑、删除、分享灵感记录
 * 包含AI分析占位区域（功能即将推出）
 * 
 * 分享功能:
 * - Web端: Canvas绘制卡片 → 下载PNG图片 / 复制文字
 * - 原生端: ViewShot截图 → 系统分享 / 保存到相册
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

// Canvas绘图辅助函数
function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");
  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") { lines.push(""); continue; }
    let currentLine = "";
    for (let i = 0; i < paragraph.length; i++) {
      const char = paragraph[i];
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
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
      await updateInspiration.mutateAsync({ id: inspirationId, content: editContent.trim() });
      setIsEditing(false);
      refetch();
      if (Platform.OS !== "web") Alert.alert("", "修改已保存");
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
      if (confirm("确定删除这条灵感记录？删除后不可恢复。")) confirmDelete();
    } else {
      Alert.alert("删除灵感", "确定删除这条灵感记录？删除后不可恢复。", [
        { text: "取消", style: "cancel" },
        { text: "删除", style: "destructive", onPress: confirmDelete },
      ]);
    }
  };

  const handleShare = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowShareCard(true);
  };

  // ===== Web端：Canvas生成图片并下载 =====
  const handleWebSaveImage = async () => {
    if (isSharing || !inspiration) return;
    setIsSharing(true);
    try {
      const canvas = document.createElement("canvas");
      const scale = 2;
      const cardWidth = 600;
      const padding = 48;
      const contentWidth = cardWidth - padding * 2;

      const ctx = canvas.getContext("2d")!;
      canvas.width = cardWidth * scale;
      canvas.height = 1200 * scale;
      ctx.scale(scale, scale);

      // 计算内容文字行数
      ctx.font = "16px -apple-system, 'PingFang SC', 'Hiragino Sans GB', sans-serif";
      const lines = wrapText(ctx, inspiration.content, contentWidth);
      const contentHeight = lines.length * 26;

      // 计算卡片高度
      const wordsHeight = 40;
      const dividerMargin = 24;
      const footerHeight = 40;
      const totalHeight = padding + wordsHeight + dividerMargin + 1 + dividerMargin + contentHeight + 32 + footerHeight + padding;

      canvas.width = cardWidth * scale;
      canvas.height = totalHeight * scale;
      ctx.scale(scale, scale);

      // 暖阳渐变背景
      drawRoundRect(ctx, 0, 0, cardWidth, totalHeight, 20, "#FFFCF7");

      // 顶部装饰线
      ctx.beginPath();
      ctx.moveTo(padding, padding - 8);
      ctx.lineTo(cardWidth - padding, padding - 8);
      const gradient = ctx.createLinearGradient(padding, 0, cardWidth - padding, 0);
      gradient.addColorStop(0, "#F5A623");
      gradient.addColorStop(1, "#F5D9A8");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 三个词
      let y = padding + 8;
      ctx.font = "bold 20px -apple-system, 'PingFang SC', 'Hiragino Sans GB', sans-serif";
      ctx.fillStyle = "#C48A1A";
      ctx.textAlign = "center";
      ctx.fillText(`${inspiration.word1}  ·  ${inspiration.word2}  ·  ${inspiration.word3}`, cardWidth / 2, y + 28);
      y += wordsHeight + dividerMargin;

      // 分隔线
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(cardWidth - padding, y);
      ctx.strokeStyle = "#F0EDE8";
      ctx.lineWidth = 1;
      ctx.stroke();
      y += dividerMargin;

      // 内容文字
      ctx.font = "16px -apple-system, 'PingFang SC', 'Hiragino Sans GB', sans-serif";
      ctx.fillStyle = "#2D2D2D";
      ctx.textAlign = "left";
      for (const line of lines) {
        ctx.fillText(line, padding, y + 18);
        y += 26;
      }
      y += 32;

      // 底部分隔线
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(cardWidth - padding, y);
      ctx.strokeStyle = "#F0EDE8";
      ctx.lineWidth = 1;
      ctx.stroke();
      y += 20;

      // 日期和品牌
      ctx.font = "12px -apple-system, 'PingFang SC', 'Hiragino Sans GB', sans-serif";
      ctx.fillStyle = "#B0B0B5";
      ctx.textAlign = "left";
      ctx.fillText(formatShareDate(inspiration.createdAt), padding, y + 10);
      ctx.textAlign = "right";
      ctx.fillStyle = "#F5A623";
      ctx.font = "300 14px -apple-system, 'PingFang SC', 'Hiragino Sans GB', sans-serif";
      ctx.fillText("灵 感", cardWidth - padding, y + 10);

      // 下载图片
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `灵感_${inspiration.word1}_${inspiration.word2}_${inspiration.word3}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert("图片已保存到下载文件夹");
      setShowShareCard(false);
    } catch (e) {
      console.error("保存图片失败:", e);
      alert("保存图片失败,请重试");
    } finally {
      setIsSharing(false);
    }
  };

  // ===== Web端：复制文字 =====
  const handleWebCopyText = async () => {
    if (!inspiration) return;
    try {
      const text = `${inspiration.word1} · ${inspiration.word2} · ${inspiration.word3}\n\n${inspiration.content}\n\n— 灵感 ${formatShareDate(inspiration.createdAt)}`;
      await navigator.clipboard.writeText(text);
      alert("灵感内容已复制到剪贴板");
      setShowShareCard(false);
    } catch (e) {
      alert("复制失败,请重试");
    }
  };

  // ===== 原生端：截图分享 =====
  const handleNativeShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      if (!captureRef || !shareCardRef.current) {
        Alert.alert("提示", "分享功能暂不可用");
        setIsSharing(false);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
      const uri = await captureRef(shareCardRef.current, { format: "png", quality: 1, result: "tmpfile" });
      if (Sharing && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png" });
      } else if (MediaLibrary) {
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
      Alert.alert("提示", "分享失败,请重试");
    } finally {
      setShowShareCard(false);
      setIsSharing(false);
    }
  };

  // ===== 原生端：保存到相册 =====
  const handleNativeSaveToAlbum = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      if (!captureRef || !shareCardRef.current) {
        setIsSharing(false);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
      const uri = await captureRef(shareCardRef.current, { format: "png", quality: 1, result: "tmpfile" });
      if (MediaLibrary) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === "granted") {
          await MediaLibrary.saveToLibraryAsync(uri);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
          <ActivityIndicator size="small" color="#F5A623" />
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

  // 分享卡片内容（用于截图和预览）
  const ShareCardContent = () => (
    <View style={shareStyles.card}>
      {/* 顶部装饰线 */}
      <View style={shareStyles.topAccent} />
      <View style={shareStyles.wordsSection}>
        <Text style={shareStyles.word1}>{inspiration.word1}</Text>
        <Text style={shareStyles.wordDot}>·</Text>
        <Text style={shareStyles.word2}>{inspiration.word2}</Text>
        <Text style={shareStyles.wordDot}>·</Text>
        <Text style={shareStyles.word3}>{inspiration.word3}</Text>
      </View>
      <View style={shareStyles.divider} />
      <Text style={shareStyles.content}>{inspiration.content}</Text>
      <View style={shareStyles.footer}>
        <Text style={shareStyles.date}>{formatShareDate(inspiration.createdAt)}</Text>
        <Text style={shareStyles.brand}>灵 感</Text>
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
            <MaterialIcons name="arrow-back" size={24} color="#2D2D2D" />
          </Pressable>
          <View style={styles.navActions}>
            {!isEditing ? (
              <>
                <Pressable
                  onPress={handleShare}
                  style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.5 }]}
                  hitSlop={12}
                >
                  <MaterialIcons name="ios-share" size={22} color="#2D2D2D" />
                </Pressable>
                <Pressable
                  onPress={handleStartEdit}
                  style={({ pressed }) => [styles.navButton, { marginLeft: 16 }, pressed && { opacity: 0.5 }]}
                  hitSlop={12}
                >
                  <MaterialIcons name="edit" size={22} color="#2D2D2D" />
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  style={({ pressed }) => [styles.navButton, { marginLeft: 16 }, pressed && { opacity: 0.5 }]}
                  hitSlop={12}
                >
                  <MaterialIcons name="delete-outline" size={22} color="#E74C3C" />
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
                placeholderTextColor="#B0B0B5"
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
                  ]}>保存修改</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Text style={styles.contentText}>{inspiration.content}</Text>
          )}
        </View>

        {/* AI 分析占位区域 */}
        {!isEditing && (
          <View style={styles.aiSection}>
            <View style={styles.aiHeader}>
              <MaterialIcons name="auto-awesome" size={18} color="#F5A623" />
              <Text style={styles.aiTitle}>AI 创意分析</Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>即将推出</Text>
              </View>
            </View>
            <Text style={styles.aiDescription}>
              AI 将为你的灵感提供深度分析，包括创意解读、联想拓展和可行性评估。
            </Text>
            <View style={styles.aiPreviewItems}>
              <View style={styles.aiPreviewItem}>
                <MaterialIcons name="lightbulb-outline" size={16} color="#F5D9A8" />
                <Text style={styles.aiPreviewText}>创意解读</Text>
              </View>
              <View style={styles.aiPreviewItem}>
                <MaterialIcons name="trending-up" size={16} color="#F5D9A8" />
                <Text style={styles.aiPreviewText}>创意评分</Text>
              </View>
              <View style={styles.aiPreviewItem}>
                <MaterialIcons name="explore" size={16} color="#F5D9A8" />
                <Text style={styles.aiPreviewText}>相似灵感</Text>
              </View>
            </View>
          </View>
        )}

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
            {/* 卡片预览 */}
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
                    onPress={handleNativeShare}
                    disabled={isSharing}
                    style={({ pressed }) => [
                      shareStyles.actionBtn, shareStyles.actionBtnPrimary,
                      isSharing && { opacity: 0.5 },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <MaterialIcons name="share" size={18} color="#FFFFFF" />
                    <Text style={shareStyles.actionBtnPrimaryText}>
                      {isSharing ? "处理中..." : "分享"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleNativeSaveToAlbum}
                    disabled={isSharing}
                    style={({ pressed }) => [
                      shareStyles.actionBtn, shareStyles.actionBtnSecondary,
                      isSharing && { opacity: 0.5 },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <MaterialIcons name="save-alt" size={18} color="#F5A623" />
                    <Text style={shareStyles.actionBtnSecondaryText}>
                      {isSharing ? "处理中..." : "保存图片"}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={handleWebSaveImage}
                    disabled={isSharing}
                    style={({ pressed }) => [
                      shareStyles.actionBtn, shareStyles.actionBtnPrimary,
                      isSharing && { opacity: 0.5 },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <MaterialIcons name="save-alt" size={18} color="#FFFFFF" />
                    <Text style={shareStyles.actionBtnPrimaryText}>
                      {isSharing ? "生成中..." : "保存图片"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleWebCopyText}
                    style={({ pressed }) => [
                      shareStyles.actionBtn, shareStyles.actionBtnSecondary,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <MaterialIcons name="content-copy" size={18} color="#F5A623" />
                    <Text style={shareStyles.actionBtnSecondaryText}>复制文字</Text>
                  </Pressable>
                </>
              )}
            </View>

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
  emptyText: { fontSize: 16, color: "#8E8E93", marginBottom: 16 },
  backLink: { paddingVertical: 8, paddingHorizontal: 16 },
  backLinkText: { fontSize: 15, color: "#F5A623", textDecorationLine: "underline" },
  navbar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 12, paddingBottom: 20,
  },
  navButton: { padding: 4 },
  navActions: { flexDirection: "row", alignItems: "center" },
  wordsSection: { alignItems: "center", paddingVertical: 32 },
  wordsRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center" },
  wordText: { fontSize: 22, fontWeight: "700", color: "#C48A1A", letterSpacing: 2 },
  wordDot: { fontSize: 18, color: "#F5D9A8", marginHorizontal: 12 },
  divider: { height: 1, backgroundColor: "#F0EDE8", marginHorizontal: 20, marginBottom: 32 },
  contentSection: { flex: 1, minHeight: 200 },
  contentText: { fontSize: 17, lineHeight: 28, color: "#2D2D2D", letterSpacing: 0.5 },
  editInput: {
    fontSize: 17, lineHeight: 28, color: "#2D2D2D", letterSpacing: 0.5,
    backgroundColor: "#FFFCF7", borderRadius: 12, padding: 20,
    minHeight: 200, textAlignVertical: "top",
    borderWidth: 1, borderColor: "#F0EDE8",
  },
  editActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, gap: 16 },
  cancelButton: {
    flex: 1, paddingVertical: 14, backgroundColor: "#FFFFFF", borderRadius: 28,
    alignItems: "center", borderWidth: 1, borderColor: "#F0EDE8",
  },
  cancelButtonText: { fontSize: 15, color: "#8E8E93", letterSpacing: 1 },
  saveEditButton: {
    flex: 1, paddingVertical: 14, backgroundColor: "#F5A623", borderRadius: 28, alignItems: "center",
  },
  saveEditButtonText: { fontSize: 15, color: "#FFFFFF", fontWeight: "500", letterSpacing: 1 },
  saveEditButtonDisabled: { backgroundColor: "#F0EDE8" },
  saveEditButtonTextDisabled: { color: "#B0B0B5" },

  /* AI 分析占位区域 */
  aiSection: {
    marginTop: 32, backgroundColor: "#FFF8EE", borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: "#F5D9A8",
  },
  aiHeader: {
    flexDirection: "row", alignItems: "center", marginBottom: 12,
  },
  aiTitle: {
    fontSize: 15, fontWeight: "600", color: "#C48A1A", marginLeft: 8, flex: 1,
  },
  aiBadge: {
    backgroundColor: "#F5D9A8", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3,
  },
  aiBadgeText: { fontSize: 11, color: "#C48A1A", fontWeight: "500" },
  aiDescription: {
    fontSize: 14, lineHeight: 22, color: "#8E8E93", marginBottom: 16,
  },
  aiPreviewItems: {
    flexDirection: "row", justifyContent: "space-around",
  },
  aiPreviewItem: {
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  aiPreviewText: { fontSize: 13, color: "#C48A1A" },

  metaSection: { marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: "#F0EDE8" },
  metaText: { fontSize: 13, color: "#B0B0B5", letterSpacing: 1 },
});

const CARD_WIDTH = SCREEN_WIDTH - 64;

const shareStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", padding: 32,
  },
  modalContent: { width: CARD_WIDTH + 32, alignItems: "center" },
  card: {
    width: CARD_WIDTH, backgroundColor: "#FFFCF7", borderRadius: 20,
    padding: 32, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  topAccent: {
    height: 2, backgroundColor: "#F5A623", borderRadius: 1,
    marginBottom: 24, marginHorizontal: -8,
  },
  wordsSection: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    flexWrap: "wrap", marginBottom: 24,
  },
  word1: { fontSize: 20, fontWeight: "700", color: "#C48A1A", letterSpacing: 2 },
  word2: { fontSize: 20, fontWeight: "700", color: "#C48A1A", letterSpacing: 2 },
  word3: { fontSize: 20, fontWeight: "700", color: "#C48A1A", letterSpacing: 2 },
  wordDot: { fontSize: 16, color: "#F5D9A8", marginHorizontal: 10 },
  divider: { height: 1, backgroundColor: "#F0EDE8", marginBottom: 24 },
  content: {
    fontSize: 16, lineHeight: 26, color: "#2D2D2D", letterSpacing: 0.3,
    marginBottom: 28, textAlign: "left",
  },
  footer: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderTopWidth: 1, borderTopColor: "#F0EDE8", paddingTop: 16,
  },
  date: { fontSize: 12, color: "#B0B0B5", letterSpacing: 1 },
  brand: { fontSize: 14, color: "#F5A623", letterSpacing: 4, fontWeight: "300" },
  actions: {
    flexDirection: "row", marginTop: 20, gap: 12, width: CARD_WIDTH,
  },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: 28, paddingVertical: 14, gap: 8,
  },
  actionBtnPrimary: { backgroundColor: "#F5A623" },
  actionBtnPrimaryText: { fontSize: 15, color: "#FFFFFF", fontWeight: "500", letterSpacing: 1 },
  actionBtnSecondary: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#F5D9A8" },
  actionBtnSecondaryText: { fontSize: 15, color: "#F5A623", fontWeight: "500", letterSpacing: 1 },
  closeButton: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 32 },
  closeButtonText: { fontSize: 15, color: "#FFFFFF", letterSpacing: 1 },
});
