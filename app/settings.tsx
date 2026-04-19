/**
 * 设置页面
 * 包含 AI 服务配置和外观模式切换
 */

import { useState, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  Platform, Alert, ActivityIndicator,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useThemeManager, type AppearanceMode } from "@/lib/theme-context";
import {
  getAIConfig, saveAIConfig, clearAIConfig, testConnection,
  AI_PLATFORMS, type AIPlatform, type AIConfig,
} from "@/services/aiConfig";

const APPEARANCE_OPTIONS: { value: AppearanceMode; label: string; icon: string }[] = [
  { value: "system", label: "跟随系统", icon: "brightness-auto" },
  { value: "light", label: "浅色模式", icon: "light-mode" },
  { value: "dark", label: "深色模式", icon: "dark-mode" },
];

const PLATFORM_OPTIONS: { value: AIPlatform; label: string; desc: string }[] = [
  { value: "openai", label: "OpenAI (GPT)", desc: "使用 gpt-4o-mini 模型" },
  { value: "qwen", label: "通义千问 (阿里云)", desc: "使用 qwen-turbo 模型" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { appearanceMode, setAppearanceMode } = useThemeManager();

  // AI 配置状态
  const [aiPlatform, setAiPlatform] = useState<AIPlatform>("openai");
  const [apiKey, setApiKey] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);

  // 加载已有配置
  useEffect(() => {
    getAIConfig().then((config) => {
      if (config) {
        setAiPlatform(config.platform);
        setApiKey(config.apiKey);
        setHasExistingConfig(true);
      }
    });
  }, []);

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      const msg = "请先输入 API Key";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("提示", msg);
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection({ platform: aiPlatform, apiKey: apiKey.trim() });
      setTestResult(result);
      if (result.success && Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || "测试失败" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!apiKey.trim()) {
      const msg = "请先输入 API Key";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("提示", msg);
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSaving(true);
    try {
      await saveAIConfig({ platform: aiPlatform, apiKey: apiKey.trim() });
      setHasExistingConfig(true);
      const msg = "AI 配置已保存";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("", msg);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      const msg = "保存失败：" + (e.message || "未知错误");
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("错误", msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearConfig = () => {
    const doIt = async () => {
      await clearAIConfig();
      setApiKey("");
      setHasExistingConfig(false);
      setTestResult(null);
      const msg = "AI 配置已清除";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("", msg);
    };
    if (Platform.OS === "web") {
      if (confirm("确定清除 AI 配置？")) doIt();
    } else {
      Alert.alert("清除配置", "确定清除 AI 配置？清除后需要重新输入 API Key。", [
        { text: "取消", style: "cancel" },
        { text: "清除", style: "destructive", onPress: doIt },
      ]);
    }
  };

  const handleAppearanceChange = (mode: AppearanceMode) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAppearanceMode(mode);
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
          <Text style={[styles.navTitle, { color: c.foreground }]}>设置</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* 外观模式 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>外观模式</Text>
            <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              {APPEARANCE_OPTIONS.map((opt, idx) => (
                <View key={opt.value}>
                  {idx > 0 && <View style={[styles.divider, { backgroundColor: c.border }]} />}
                  <Pressable
                    onPress={() => handleAppearanceChange(opt.value)}
                    style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.7 }]}
                  >
                    <MaterialIcons name={opt.icon as any} size={20} color={c.primary} />
                    <Text style={[styles.optionLabel, { color: c.foreground }]}>{opt.label}</Text>
                    {appearanceMode === opt.value && (
                      <MaterialIcons name="check" size={20} color={c.primary} />
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          </View>

          {/* AI 服务配置 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>AI 服务配置</Text>
            <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              {/* 平台选择 */}
              <Text style={[styles.fieldLabel, { color: c.muted }]}>AI 平台</Text>
              <Pressable
                onPress={() => setShowPlatformPicker(!showPlatformPicker)}
                style={({ pressed }) => [
                  styles.platformSelector,
                  { backgroundColor: c.inputBg, borderColor: c.inputBorder },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.platformText, { color: c.foreground }]}>
                  {PLATFORM_OPTIONS.find(p => p.value === aiPlatform)?.label}
                </Text>
                <MaterialIcons
                  name={showPlatformPicker ? "expand-less" : "expand-more"}
                  size={20}
                  color={c.muted}
                />
              </Pressable>

              {showPlatformPicker && (
                <View style={[styles.platformDropdown, { backgroundColor: c.inputBg, borderColor: c.border }]}>
                  {PLATFORM_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        setAiPlatform(opt.value);
                        setShowPlatformPicker(false);
                        setTestResult(null);
                      }}
                      style={({ pressed }) => [
                        styles.platformOption,
                        aiPlatform === opt.value && { backgroundColor: c.accentLight },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[styles.platformOptionLabel, { color: c.foreground }]}>{opt.label}</Text>
                      <Text style={[styles.platformOptionDesc, { color: c.muted }]}>{opt.desc}</Text>
                      {aiPlatform === opt.value && (
                        <MaterialIcons name="check" size={18} color={c.primary} style={{ position: "absolute", right: 16, top: 16 }} />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}

              {/* API Key 输入 */}
              <Text style={[styles.fieldLabel, { color: c.muted, marginTop: 20 }]}>API Key</Text>
              <TextInput
                style={[
                  styles.apiKeyInput,
                  { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.foreground },
                ]}
                value={apiKey}
                onChangeText={(t) => { setApiKey(t); setTestResult(null); }}
                placeholder={`输入 ${PLATFORM_OPTIONS.find(p => p.value === aiPlatform)?.label} API Key`}
                placeholderTextColor={c.muted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* 测试结果 */}
              {testResult && (
                <View style={[
                  styles.testResult,
                  { backgroundColor: testResult.success ? (c.isDark ? "#1a3a1a" : "#F0FFF0") : (c.isDark ? "#3a1a1a" : "#FFF0F0") },
                ]}>
                  <MaterialIcons
                    name={testResult.success ? "check-circle" : "error"}
                    size={16}
                    color={testResult.success ? c.success : c.error}
                  />
                  <Text style={[styles.testResultText, { color: testResult.success ? c.success : c.error }]}>
                    {testResult.message}
                  </Text>
                </View>
              )}

              {/* 操作按钮 */}
              <View style={styles.aiActions}>
                <Pressable
                  onPress={handleTestConnection}
                  disabled={isTesting || !apiKey.trim()}
                  style={({ pressed }) => [
                    styles.testButton,
                    { borderColor: c.primary },
                    (!apiKey.trim() || isTesting) && { opacity: 0.5 },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  {isTesting ? (
                    <ActivityIndicator size="small" color={c.primary} />
                  ) : (
                    <Text style={[styles.testButtonText, { color: c.primary }]}>测试连接</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={handleSaveConfig}
                  disabled={isSaving || !apiKey.trim()}
                  style={({ pressed }) => [
                    styles.saveButton,
                    { backgroundColor: c.primary },
                    (!apiKey.trim() || isSaving) && { opacity: 0.5 },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={c.isDark ? "#1C1C1E" : "#FFFFFF"} />
                  ) : (
                    <Text style={[styles.saveButtonText, { color: c.isDark ? "#1C1C1E" : "#FFFFFF" }]}>保存配置</Text>
                  )}
                </Pressable>
              </View>

              {hasExistingConfig && (
                <Pressable
                  onPress={handleClearConfig}
                  style={({ pressed }) => [styles.clearButton, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.clearButtonText, { color: c.error }]}>清除 AI 配置</Text>
                </Pressable>
              )}
            </View>
          </View>

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
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 14, fontWeight: "600", letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  card: { borderRadius: 14, padding: 16, borderWidth: 1 },
  divider: { height: 1, marginVertical: 2 },
  optionRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 4, gap: 12,
  },
  optionLabel: { fontSize: 15, flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: "500", marginBottom: 8, marginLeft: 2 },
  platformSelector: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
  },
  platformText: { fontSize: 15 },
  platformDropdown: {
    marginTop: 8, borderRadius: 10, borderWidth: 1, overflow: "hidden",
  },
  platformOption: { paddingHorizontal: 16, paddingVertical: 14 },
  platformOptionLabel: { fontSize: 15, fontWeight: "500" },
  platformOptionDesc: { fontSize: 12, marginTop: 2 },
  apiKeyInput: {
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15,
  },
  testResult: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8,
  },
  testResultText: { fontSize: 13, flex: 1 },
  aiActions: { flexDirection: "row", marginTop: 16, gap: 12 },
  testButton: {
    flex: 1, borderRadius: 24, borderWidth: 1.5, paddingVertical: 12,
    alignItems: "center", justifyContent: "center",
  },
  testButtonText: { fontSize: 14, fontWeight: "500", letterSpacing: 0.5 },
  saveButton: {
    flex: 1, borderRadius: 24, paddingVertical: 12,
    alignItems: "center", justifyContent: "center",
  },
  saveButtonText: { fontSize: 14, fontWeight: "500", letterSpacing: 0.5 },
  clearButton: { marginTop: 16, alignItems: "center", paddingVertical: 8 },
  clearButtonText: { fontSize: 13 },
});
