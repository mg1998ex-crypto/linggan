/**
 * 意见反馈页面
 * 支持 Bug报告/功能建议/其他 三种类型
 * 提交后格式化文字 → 复制到剪贴板 → 尝试跳转QQ
 */

import { useState } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  Platform, Alert, Linking,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useThemeColors } from "@/hooks/use-theme-colors";
import {
  saveFeedbackRecord, formatFeedbackText,
  type FeedbackType,
} from "@/services/feedbackStorage";

let Clipboard: any = null;
if (Platform.OS !== "web") {
  try { Clipboard = require("expo-clipboard"); } catch (e) { /* not available */ }
}

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: string }[] = [
  { value: "bug", label: "Bug 报告", icon: "bug-report" },
  { value: "feature", label: "功能建议", icon: "lightbulb-outline" },
  { value: "other", label: "其他", icon: "more-horiz" },
];

const QQ_NUMBER = "2522507815";
const QQ_LINK = `mqqwpa://im/chat?chat_type=wpa&uin=${QQ_NUMBER}`;

export default function FeedbackScreen() {
  const router = useRouter();
  const c = useThemeColors();

  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      const msg = "请输入反馈内容";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("提示", msg);
      return;
    }

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSubmitting(true);

    try {
      // 1. 保存到本地
      const record = await saveFeedbackRecord({
        type: feedbackType,
        content: content.trim(),
        contact: contact.trim(),
      });

      // 2. 格式化文字
      const formattedText = formatFeedbackText(record);

      // 3. 复制到剪贴板
      if (Platform.OS === "web") {
        await navigator.clipboard.writeText(formattedText).catch(() => {});
      } else if (Clipboard) {
        await Clipboard.setStringAsync(formattedText);
      }

      // 4. 尝试跳转QQ
      if (Platform.OS !== "web") {
        try {
          const canOpen = await Linking.canOpenURL(QQ_LINK);
          if (canOpen) {
            await Linking.openURL(QQ_LINK);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              "反馈已提交",
              "反馈内容已复制到剪贴板，请在QQ对话中粘贴发送",
              [{ text: "好的", onPress: () => router.back() }]
            );
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              "反馈已保存",
              `内容已复制到剪贴板，请通过其他方式发送给开发者\n\nQQ：${QQ_NUMBER}\n邮箱：${QQ_NUMBER}@qq.com`,
              [{ text: "好的", onPress: () => router.back() }]
            );
          }
        } catch {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            "反馈已保存",
            `内容已复制到剪贴板，请通过其他方式发送给开发者\n\nQQ：${QQ_NUMBER}\n邮箱：${QQ_NUMBER}@qq.com`,
            [{ text: "好的", onPress: () => router.back() }]
          );
        }
      } else {
        // Web端
        alert(`反馈已保存！内容已复制到剪贴板。\n\n请通过以下方式发送给开发者：\nQQ：${QQ_NUMBER}\n邮箱：${QQ_NUMBER}@qq.com`);
        router.back();
      }

      // 清空表单
      setContent("");
      setContact("");
    } catch (e: any) {
      const msg = "提交失败：" + (e.message || "未知错误");
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("错误", msg);
    } finally {
      setIsSubmitting(false);
    }
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
          <Text style={[styles.navTitle, { color: c.foreground }]}>意见反馈</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* 反馈类型 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>反馈类型</Text>
            <View style={styles.typeRow}>
              {FEEDBACK_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => {
                    setFeedbackType(t.value);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={({ pressed }) => [
                    styles.typeChip,
                    {
                      backgroundColor: feedbackType === t.value ? c.accentLight : c.surface,
                      borderColor: feedbackType === t.value ? c.primary : c.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <MaterialIcons
                    name={t.icon as any}
                    size={18}
                    color={feedbackType === t.value ? c.primary : c.muted}
                  />
                  <Text style={[
                    styles.typeChipText,
                    { color: feedbackType === t.value ? c.accentDark : c.muted },
                  ]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 反馈内容 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>反馈内容 *</Text>
            <TextInput
              style={[
                styles.contentInput,
                { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.foreground },
              ]}
              multiline
              value={content}
              onChangeText={setContent}
              placeholder={
                feedbackType === "bug"
                  ? "请描述你遇到的问题，包括操作步骤和预期行为..."
                  : feedbackType === "feature"
                  ? "请描述你期望的功能，以及它能解决什么问题..."
                  : "请输入你的反馈内容..."
              }
              placeholderTextColor={c.muted}
              textAlignVertical="top"
            />
          </View>

          {/* 联系方式 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>联系方式（选填）</Text>
            <TextInput
              style={[
                styles.contactInput,
                { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.foreground },
              ]}
              value={contact}
              onChangeText={setContact}
              placeholder="QQ / 邮箱 / 微信，方便开发者回复你"
              placeholderTextColor={c.muted}
            />
          </View>

          {/* 提交按钮 */}
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: c.primary },
              (!content.trim() || isSubmitting) && { opacity: 0.5 },
              pressed && content.trim() && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons name="send" size={18} color={c.isDark ? "#1C1C1E" : "#FFFFFF"} />
            <Text style={[styles.submitButtonText, { color: c.isDark ? "#1C1C1E" : "#FFFFFF" }]}>
              {isSubmitting ? "提交中..." : "提交反馈"}
            </Text>
          </Pressable>

          {/* 反馈历史入口 */}
          <Pressable
            onPress={() => router.push("/feedback-history")}
            style={({ pressed }) => [styles.historyLink, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="history" size={16} color={c.muted} />
            <Text style={[styles.historyLinkText, { color: c.muted }]}>我的反馈记录</Text>
            <MaterialIcons name="chevron-right" size={16} color={c.muted} />
          </Pressable>

          <View style={{ height: 60 }} />
        </ScrollView>
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
  scrollContent: { flexGrow: 1, paddingHorizontal: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: "600", letterSpacing: 0.5, marginBottom: 12, marginLeft: 2 },
  typeRow: { flexDirection: "row", gap: 10 },
  typeChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1,
  },
  typeChipText: { fontSize: 14, fontWeight: "500" },
  contentInput: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, lineHeight: 22, minHeight: 160,
  },
  contactInput: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15,
  },
  submitButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: 28, paddingVertical: 14, gap: 8, marginBottom: 24,
  },
  submitButtonText: { fontSize: 15, fontWeight: "500", letterSpacing: 0.5 },
  historyLink: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 12,
  },
  historyLinkText: { fontSize: 14 },
});
