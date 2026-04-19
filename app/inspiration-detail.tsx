/**
 * 灵感详情页面
 * 查看、编辑、删除、分享灵感记录
 * AI创意分析功能（调用用户配置的LLM API）
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
import { useThemeColors } from "@/hooks/use-theme-colors";
import { analyzeInspiration, isAIServiceAvailable } from "@/services/aiService";

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
  const c = useThemeColors();
  const inspirationId = Number(id);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [showShareCard, setShowShareCard] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const shareCardRef = useRef<any>(null);

  // AI 分析状态
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);

  const { data: inspiration, isLoading, refetch } = trpc.inspirations.getById.useQuery(
    { id: inspirationId },
    { enabled: !!inspirationId }
  );
  const updateInspiration = trpc.inspirations.update.useMutation();
  const deleteInspiration = trpc.inspirations.delete.useMutation();

  useEffect(() => {
    if (inspiration) {
      setEditContent(inspiration.content);
      // 如果已有 AI 分析结果，显示它
      if ((inspiration as any).aiAnalysis) {
        setAiResult((inspiration as any).aiAnalysis);
      }
    }
  }, [inspiration]);

  // 检查 AI 服务是否可用
  useEffect(() => {
    isAIServiceAvailable().then(setAiAvailable);
  }, []);

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
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    Keyboard.dismiss();
    setEditContent(inspiration?.content || "");
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Keyboard.dismiss();
    try {
      await updateInspiration.mutateAsync({ id: inspirationId, content: editContent.trim() });
      setIsEditing(false);
      refetch();
      if (Platform.OS !== "web") Alert.alert("", "修改已保存");
    } catch (e) {
      const msg = "保存失败,请重试";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("错误", msg);
    }
  };

  const handleDelete = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const confirmDelete = async () => {
      try {
        await deleteInspiration.mutateAsync({ id: inspirationId });
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } catch (e) {
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
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowShareCard(true);
  };

  // ===== AI 分析 =====
  const handleAIAnalyze = async () => {
    if (!inspiration) return;

    if (!aiAvailable) {
      const msg = "请先在设置中配置 AI 服务的 API Key";
      if (Platform.OS === "web") {
        if (confirm(msg + "\n\n是否前往设置？")) {
          router.push("/settings");
        }
      } else {
        Alert.alert("未配置 AI 服务", msg, [
          { text: "取消", style: "cancel" },
          { text: "前往设置", onPress: () => router.push("/settings") },
        ]);
      }
      return;
    }

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAiLoading(true);
    setAiError(null);

    try {
      const result = await analyzeInspiration(
        [inspiration.word1, inspiration.word2, inspiration.word3],
        inspiration.content
      );
      setAiResult(result);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 尝试保存到数据库
      try {
        await updateInspiration.mutateAsync({
          id: inspirationId,
          content: inspiration.content,
          aiAnalysis: result,
        });
        refetch();
      } catch { /* 保存失败不影响显示 */ }
    } catch (e: any) {
      if (e.message === "NO_API_KEY") {
        setAiError("请先在设置中配置 AI 服务的 API Key");
      } else {
        setAiError(e.message || "AI 分析失败，请重试");
      }
    } finally {
      setAiLoading(false);
    }
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

      ctx.font = "16px -apple-system, 'PingFang SC', 'Hiragino Sans GB', sans-serif";
      const lines = wrapText(ctx, inspiration.content, contentWidth);
      const contentHeight = lines.length * 26;

      const wordsHeight = 40;
      const dividerMargin = 24;
      const footerHeight = 40;
      const totalHeight = padding + wordsHeight + dividerMargin + 1 + dividerMargin + contentHeight + 32 + footerHeight + padding;

      canvas.width = cardWidth * scale;
      canvas.height = totalHeight * scale;
      ctx.scale(scale, scale);

      drawRoundRect(ctx, 0, 0, cardWidth, totalHeight, 20, "#FFFCF7");

      ctx.beginPath();
      ctx.moveTo(padding, padding - 8);
      ctx.lineTo(cardWidth - padding, padding - 8);
      const gradient = ctx.createLinearGradient(padding, 0, cardWidth - padding, 0);
      gradient.addColorStop(0, "#F5A623");
      gradient.addColorStop(1, "#F5D9A8");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();

      let y = padding + 8;
      ctx.font = "bold 20px -apple-system, 'PingFang SC', 'Hiragino Sans GB', sans-serif";
      ctx.fillStyle = "#C48A1A";
      ctx.textAlign = "center";
      ctx.fillText(`${inspiration.word1}  ·  ${inspiration.word2}  ·  ${inspiration.word3}`, cardWidth / 2, y + 28);
      y += wordsHeight + dividerMargin;

      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(cardWidth - padding, y);
      ctx.strokeStyle = "#F0EDE8";
      ctx.lineWidth = 1;
      ctx.stroke();
      y += dividerMargin;

      ctx.font = "16px -apple-system, 'PingFang SC', 'Hiragino Sans GB', sans-serif";
      ctx.fillStyle = "#2D2D2D";
      ctx.textAlign = "left";
      for (const line of lines) {
        ctx.fillText(line, padding, y + 18);
        y += 26;
      }
      y += 32;

      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(cardWidth - padding, y);
      ctx.strokeStyle = "#F0EDE8";
      ctx.lineWidth = 1;
      ctx.stroke();
      y += 20;

      ctx.font = "12px -apple-system, 'PingFang SC', 'Hiragino Sans GB', sans-serif";
      ctx.fillStyle = "#B0B0B5";
      ctx.textAlign = "left";
      ctx.fillText(formatShareDate(inspiration.createdAt), padding, y + 10);
      ctx.textAlign = "right";
      ctx.fillStyle = "#F5A623";
      ctx.font = "300 14px -apple-system, 'PingFang SC', 'Hiragino Sans GB', sans-serif";
      ctx.fillText("灵 感", cardWidth - padding, y + 10);

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
      alert("保存图片失败,请重试");
    } finally {
      setIsSharing(false);
    }
  };

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
        }
      }
    } catch (e) {
      Alert.alert("提示", "分享失败,请重试");
    } finally {
      setShowShareCard(false);
      setIsSharing(false);
    }
  };

  const handleNativeSaveToAlbum = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      if (!captureRef || !shareCardRef.current) { setIsSharing(false); return; }
      await new Promise(resolve => setTimeout(resolve, 300));
      const uri = await captureRef(shareCardRef.current, { format: "png", quality: 1, result: "tmpfile" });
      if (MediaLibrary) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === "granted") {
          await MediaLibrary.saveToLibraryAsync(uri);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("", "图片已保存到相册");
        }
      }
    } catch (e) {
      Alert.alert("提示", "保存失败,请重试");
    } finally {
      setShowShareCard(false);
      setIsSharing(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={[styles.loadingContainer, { backgroundColor: c.background }]}>
          <ActivityIndicator size="small" color={c.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!inspiration) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={[styles.loadingContainer, { backgroundColor: c.background }]}>
          <Text style={[styles.emptyText, { color: c.muted }]}>灵感记录不存在</Text>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={[styles.backLinkText, { color: c.primary }]}>返回列表</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const ShareCardContent = () => (
    <View style={shareStyles.card}>
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
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor: c.background }]}
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: c.background }}
      >
        {/* 顶部导航栏 */}
        <View style={styles.navbar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.5 }]}
            hitSlop={12}
          >
            <MaterialIcons name="arrow-back" size={24} color={c.foreground} />
          </Pressable>
          <View style={styles.navActions}>
            {!isEditing ? (
              <>
                <Pressable
                  onPress={handleShare}
                  style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.5 }]}
                  hitSlop={12}
                >
                  <MaterialIcons name="ios-share" size={22} color={c.foreground} />
                </Pressable>
                <Pressable
                  onPress={handleStartEdit}
                  style={({ pressed }) => [styles.navButton, { marginLeft: 16 }, pressed && { opacity: 0.5 }]}
                  hitSlop={12}
                >
                  <MaterialIcons name="edit" size={22} color={c.foreground} />
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  style={({ pressed }) => [styles.navButton, { marginLeft: 16 }, pressed && { opacity: 0.5 }]}
                  hitSlop={12}
                >
                  <MaterialIcons name="delete-outline" size={22} color={c.error} />
                </Pressable>
              </>
            ) : null}
          </View>
        </View>

        {/* 三个原词 */}
        <View style={styles.wordsSection}>
          <View style={styles.wordsRow}>
            <Text style={[styles.wordText, { color: c.accentDark }]}>{inspiration.word1}</Text>
            <Text style={[styles.wordDot, { color: c.badgeBg }]}>·</Text>
            <Text style={[styles.wordText, { color: c.accentDark }]}>{inspiration.word2}</Text>
            <Text style={[styles.wordDot, { color: c.badgeBg }]}>·</Text>
            <Text style={[styles.wordText, { color: c.accentDark }]}>{inspiration.word3}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: c.border }]} />

        {/* 灵感内容 */}
        <View style={styles.contentSection}>
          {isEditing ? (
            <>
              <TextInput
                style={[styles.editInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.foreground }]}
                multiline
                value={editContent}
                onChangeText={setEditContent}
                autoFocus
                placeholder="编辑灵感内容..."
                placeholderTextColor={c.muted}
              />
              <View style={styles.editActions}>
                <Pressable
                  onPress={handleCancelEdit}
                  style={({ pressed }) => [styles.cancelButton, { backgroundColor: c.surface, borderColor: c.border }, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.cancelButtonText, { color: c.muted }]}>取消</Text>
                </Pressable>
                <Pressable
                  onPress={editContent.trim() ? handleSaveEdit : undefined}
                  disabled={!editContent.trim()}
                  style={({ pressed }) => [
                    styles.saveEditButton,
                    { backgroundColor: c.primary },
                    !editContent.trim() && { backgroundColor: c.border },
                    pressed && editContent.trim() && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[
                    styles.saveEditButtonText,
                    { color: c.isDark ? "#1C1C1E" : "#FFFFFF" },
                    !editContent.trim() && { color: c.muted },
                  ]}>保存修改</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Text style={[styles.contentText, { color: c.foreground }]}>{inspiration.content}</Text>
          )}
        </View>

        {/* AI 创意分析区域 */}
        {!isEditing && (
          <View style={[styles.aiSection, { backgroundColor: c.accentLight, borderColor: c.isDark ? c.border : "#F5D9A8" }]}>
            <View style={styles.aiHeader}>
              <MaterialIcons name="auto-awesome" size={18} color={c.primary} />
              <Text style={[styles.aiTitle, { color: c.accentDark }]}>AI 创意分析</Text>
              {aiResult && !aiLoading && (
                <Pressable
                  onPress={handleAIAnalyze}
                  style={({ pressed }) => [styles.aiRetryBtn, pressed && { opacity: 0.7 }]}
                >
                  <MaterialIcons name="refresh" size={16} color={c.primary} />
                </Pressable>
              )}
            </View>

            {aiResult ? (
              /* 显示 AI 分析结果 */
              <View style={[styles.aiResultContainer, { borderLeftColor: c.primary }]}>
                <Text style={[styles.aiResultText, { color: c.foreground }]}>{aiResult}</Text>
              </View>
            ) : aiLoading ? (
              /* 加载中 */
              <View style={styles.aiLoadingContainer}>
                <ActivityIndicator size="small" color={c.primary} />
                <Text style={[styles.aiLoadingText, { color: c.muted }]}>AI 正在分析你的灵感...</Text>
              </View>
            ) : aiError ? (
              /* 错误提示 */
              <View>
                <Text style={[styles.aiErrorText, { color: c.error }]}>{aiError}</Text>
                <Pressable
                  onPress={handleAIAnalyze}
                  style={({ pressed }) => [
                    styles.aiAnalyzeBtn,
                    { backgroundColor: c.primary },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <MaterialIcons name="refresh" size={16} color={c.isDark ? "#1C1C1E" : "#FFFFFF"} />
                  <Text style={[styles.aiAnalyzeBtnText, { color: c.isDark ? "#1C1C1E" : "#FFFFFF" }]}>重试</Text>
                </Pressable>
              </View>
            ) : (
              /* 初始状态 - 分析按钮 */
              <View>
                <Text style={[styles.aiDescription, { color: c.muted }]}>
                  AI 将为你的灵感提供创意解读、评分和延伸思考方向。
                </Text>
                <Pressable
                  onPress={handleAIAnalyze}
                  style={({ pressed }) => [
                    styles.aiAnalyzeBtn,
                    { backgroundColor: c.primary },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <MaterialIcons name="auto-awesome" size={16} color={c.isDark ? "#1C1C1E" : "#FFFFFF"} />
                  <Text style={[styles.aiAnalyzeBtnText, { color: c.isDark ? "#1C1C1E" : "#FFFFFF" }]}>
                    {aiAvailable ? "开始分析" : "配置 AI 后使用"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {!isEditing && (
          <View style={[styles.metaSection, { borderTopColor: c.border }]}>
            <Text style={[styles.metaText, { color: c.muted }]}>{formatDate(inspiration.createdAt)}</Text>
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
        <View style={[shareStyles.overlay, { backgroundColor: c.overlayBg }]}>
          <View style={shareStyles.modalContent}>
            {Platform.OS !== "web" && ViewShot ? (
              <ViewShot ref={shareCardRef} options={{ format: "png", quality: 1 }}>
                <ShareCardContent />
              </ViewShot>
            ) : (
              <ShareCardContent />
            )}

            <View style={shareStyles.actions}>
              {Platform.OS !== "web" ? (
                <>
                  <Pressable
                    onPress={handleNativeShare}
                    disabled={isSharing}
                    style={({ pressed }) => [
                      shareStyles.actionBtn, { backgroundColor: c.primary },
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
                      shareStyles.actionBtn, { backgroundColor: c.primary },
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
  emptyText: { fontSize: 16, marginBottom: 16 },
  backLink: { paddingVertical: 8, paddingHorizontal: 16 },
  backLinkText: { fontSize: 15, textDecorationLine: "underline" },
  navbar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 12, paddingBottom: 20,
  },
  navButton: { padding: 4 },
  navActions: { flexDirection: "row", alignItems: "center" },
  wordsSection: { alignItems: "center", paddingVertical: 32 },
  wordsRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center" },
  wordText: { fontSize: 22, fontWeight: "700", letterSpacing: 2 },
  wordDot: { fontSize: 18, marginHorizontal: 12 },
  divider: { height: 1, marginHorizontal: 20, marginBottom: 32 },
  contentSection: { flex: 1, minHeight: 200 },
  contentText: { fontSize: 17, lineHeight: 28, letterSpacing: 0.5 },
  editInput: {
    fontSize: 17, lineHeight: 28, letterSpacing: 0.5,
    borderRadius: 12, padding: 20,
    minHeight: 200, textAlignVertical: "top",
    borderWidth: 1,
  },
  editActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, gap: 16 },
  cancelButton: {
    flex: 1, paddingVertical: 14, borderRadius: 28,
    alignItems: "center", borderWidth: 1,
  },
  cancelButtonText: { fontSize: 15, letterSpacing: 1 },
  saveEditButton: {
    flex: 1, paddingVertical: 14, borderRadius: 28, alignItems: "center",
  },
  saveEditButtonText: { fontSize: 15, fontWeight: "500", letterSpacing: 1 },

  /* AI 分析区域 */
  aiSection: {
    marginTop: 32, borderRadius: 16, padding: 20, borderWidth: 1,
  },
  aiHeader: {
    flexDirection: "row", alignItems: "center", marginBottom: 12,
  },
  aiTitle: {
    fontSize: 15, fontWeight: "600", marginLeft: 8, flex: 1,
  },
  aiRetryBtn: { padding: 4 },
  aiDescription: {
    fontSize: 14, lineHeight: 22, marginBottom: 16,
  },
  aiAnalyzeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: 24, paddingVertical: 12, gap: 8,
  },
  aiAnalyzeBtnText: { fontSize: 14, fontWeight: "500", letterSpacing: 0.5 },
  aiResultContainer: {
    borderLeftWidth: 3, paddingLeft: 14, paddingVertical: 4,
  },
  aiResultText: { fontSize: 14, lineHeight: 24, letterSpacing: 0.3 },
  aiLoadingContainer: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 20, gap: 10,
  },
  aiLoadingText: { fontSize: 14 },
  aiErrorText: { fontSize: 13, marginBottom: 12 },

  metaSection: { marginTop: 32, paddingTop: 20, borderTopWidth: 1 },
  metaText: { fontSize: 13, letterSpacing: 1 },
});

const CARD_WIDTH = SCREEN_WIDTH - 64;

const shareStyles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: "center", alignItems: "center", padding: 32,
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
  actionBtnPrimaryText: { fontSize: 15, color: "#FFFFFF", fontWeight: "500", letterSpacing: 1 },
  actionBtnSecondary: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#F5D9A8" },
  actionBtnSecondaryText: { fontSize: 15, color: "#F5A623", fontWeight: "500", letterSpacing: 1 },
  closeButton: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 32 },
  closeButtonText: { fontSize: 15, color: "#FFFFFF", letterSpacing: 1 },
});
