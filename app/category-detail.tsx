/**
 * 分类详情页面
 * 显示分类中的词语列表,支持添加/删除/移动/导入
 */

import { useState, useMemo } from "react";
import {
  View, Text, FlatList, Pressable, TextInput, StyleSheet,
  Platform, Alert, Modal, ScrollView, KeyboardAvoidingView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "@/components/screen-container";
import { useWordLibrary } from "@/lib/word-library-context";
import { useThemeColors } from "@/hooks/use-theme-colors";

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const lib = useWordLibrary();
  const c = useThemeColors();

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<"single" | "batch">("single");
  const [singleWordInput, setSingleWordInput] = useState("");
  const [batchWordInput, setBatchWordInput] = useState("");
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveWordText, setMoveWordText] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);

  if (lib.loading || !lib.data || !id) {
    return (
      <ScreenContainer>
        <View style={[styles.loadingContainer, { backgroundColor: c.background }]}>
          <Text style={[styles.loadingText, { color: c.muted }]}>加载中...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const category = lib.getCategory(id);
  if (!category) {
    return (
      <ScreenContainer>
        <View style={[styles.loadingContainer, { backgroundColor: c.background }]}>
          <Text style={[styles.loadingText, { color: c.muted }]}>分类不存在</Text>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={[styles.backLinkText, { color: c.primary }]}>返回</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) return category.words;
    const q = searchQuery.trim().toLowerCase();
    return category.words.filter((w) => w.text.toLowerCase().includes(q));
  }, [category.words, searchQuery]);

  const handleAddSingle = () => {
    const text = singleWordInput.trim();
    if (!text) return;
    const ok = lib.addWord(id, text);
    if (ok) {
      setSingleWordInput("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      if (Platform.OS === "web") alert("词语已存在或无效");
      else Alert.alert("提示", "词语已存在或无效");
    }
  };

  const handleAddBatch = () => {
    const text = batchWordInput.trim();
    if (!text) return;
    const words = text.split(/[,，、\n\r]+/).map((w) => w.trim()).filter(Boolean);
    if (words.length === 0) return;
    const [added, skipped] = lib.addWords(id, words);
    setBatchWordInput("");
    const msg = `成功添加 ${added} 个词语${skipped > 0 ? `，${skipped} 个重复已跳过` : ""}`;
    if (Platform.OS === "web") alert(msg);
    else Alert.alert("添加完成", msg);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteWord = (wordText: string) => {
    const doDelete = () => {
      lib.removeWord(id, wordText);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };
    if (Platform.OS === "web") {
      if (confirm(`删除词语"${wordText}"？`)) doDelete();
    } else {
      Alert.alert("删除词语", `确定删除"${wordText}"？`, [
        { text: "取消", style: "cancel" },
        { text: "删除", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const handleMoveWord = (wordText: string) => {
    setMoveWordText(wordText);
    setShowMoveModal(true);
  };

  const handleMoveToCategory = (toCategoryId: string) => {
    lib.moveWord(id, toCategoryId, moveWordText);
    setShowMoveModal(false);
    setMoveWordText("");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleImportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/plain", "text/csv", "text/comma-separated-values"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      let content = "";
      if (Platform.OS === "web") {
        const response = await fetch(asset.uri);
        content = await response.text();
      } else {
        content = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      }
      if (!content.trim()) {
        const msg = "文件内容为空";
        if (Platform.OS === "web") alert(msg);
        else Alert.alert("提示", msg);
        return;
      }
      const words = content.split(/[,，、\n\r;；]+/).map((w) => w.trim()).filter((w) => w.length > 0 && w.length <= 10);
      if (words.length === 0) {
        const msg = "未找到有效词语";
        if (Platform.OS === "web") alert(msg);
        else Alert.alert("提示", msg);
        return;
      }
      const [added, skipped] = lib.addWords(id, words);
      const msg = `导入完成：成功 ${added} 个${skipped > 0 ? `，重复跳过 ${skipped} 个` : ""}`;
      setImportResult(msg);
      setTimeout(() => setImportResult(null), 3000);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("导入失败:", error);
      const msg = "文件导入失败，请重试";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("错误", msg);
    }
  };

  const otherCategories = lib.data.categories.filter((ct) => ct.id !== id);

  const renderWordItem = ({ item }: { item: typeof category.words[0] }) => (
    <View style={[styles.wordItem, { borderBottomColor: c.border }]}>
      <View style={styles.wordInfo}>
        <Text style={[styles.wordText, { color: c.foreground }]}>{item.text}</Text>
        {item.isSystem && <Text style={[styles.systemBadge, { color: c.muted, backgroundColor: c.accentLight }]}>内置</Text>}
      </View>
      <View style={styles.wordActions}>
        <Pressable onPress={() => handleMoveWord(item.text)} style={({ pressed }) => [styles.wordActionButton, pressed && { opacity: 0.7 }]}>
          <Text style={[styles.wordActionText, { color: c.muted }]}>移动</Text>
        </Pressable>
        <Pressable onPress={() => handleDeleteWord(item.text)} style={({ pressed }) => [styles.wordActionButton, pressed && { opacity: 0.7 }]}>
          <Text style={[styles.wordActionText, { color: c.error }]}>删除</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: c.muted }]}>← 返回</Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          <Text style={[styles.title, { color: c.foreground }]}>{category.name}</Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>{category.words.length} 个词语</Text>
        </View>

        {importResult && (
          <View style={[styles.importResultBanner, { backgroundColor: c.accentLight, borderColor: c.isDark ? c.border : "#F5D9A8" }]}>
            <Text style={[styles.importResultText, { color: c.accentDark }]}>{importResult}</Text>
          </View>
        )}

        <View style={styles.actionBar}>
          <Pressable
            onPress={() => { setAddMode("single"); setShowAddModal(true); }}
            style={({ pressed }) => [styles.actionBarButton, { backgroundColor: c.accentLight, borderColor: c.isDark ? c.border : "#F5D9A8" }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.actionBarButtonText, { color: c.accentDark }]}>添加词语</Text>
          </Pressable>
          <Pressable
            onPress={handleImportFile}
            style={({ pressed }) => [styles.actionBarButton, { backgroundColor: c.accentLight, borderColor: c.isDark ? c.border : "#F5D9A8" }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.actionBarButtonText, { color: c.accentDark }]}>导入文件</Text>
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.foreground }]}
            placeholder="搜索词语..."
            placeholderTextColor={c.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>

        <FlatList
          data={filteredWords}
          renderItem={renderWordItem}
          keyExtractor={(item, index) => `${item.text}-${index}`}
          contentContainerStyle={styles.wordList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: c.muted }]}>
              {searchQuery.trim() ? "没有匹配的词语" : "暂无词语，点击上方添加"}
            </Text>
          }
        />
      </View>

      {/* 添加词语弹窗 */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalOverlay, { backgroundColor: c.overlayBg }]}>
          <Pressable style={[styles.modalOverlay, { backgroundColor: "transparent" }]} onPress={() => setShowAddModal(false)}>
            <Pressable style={[styles.modalContent, { backgroundColor: c.surface }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>添加词语</Text>
              <View style={[styles.modeSwitch, { backgroundColor: c.accentLight }]}>
                <Pressable
                  onPress={() => setAddMode("single")}
                  style={[styles.modeSwitchButton, addMode === "single" && { backgroundColor: c.surface }]}
                >
                  <Text style={[styles.modeSwitchText, { color: c.muted }, addMode === "single" && { color: c.foreground, fontWeight: "500" }]}>单个添加</Text>
                </Pressable>
                <Pressable
                  onPress={() => setAddMode("batch")}
                  style={[styles.modeSwitchButton, addMode === "batch" && { backgroundColor: c.surface }]}
                >
                  <Text style={[styles.modeSwitchText, { color: c.muted }, addMode === "batch" && { color: c.foreground, fontWeight: "500" }]}>批量添加</Text>
                </Pressable>
              </View>
              {addMode === "single" ? (
                <>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.foreground }]}
                    placeholder="输入词语"
                    placeholderTextColor={c.muted}
                    value={singleWordInput}
                    onChangeText={setSingleWordInput}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleAddSingle}
                  />
                  <View style={styles.modalButtons}>
                    <Pressable onPress={() => setShowAddModal(false)} style={({ pressed }) => [styles.modalButton, { backgroundColor: c.accentLight }, pressed && { opacity: 0.7 }]}>
                      <Text style={[styles.modalCancelText, { color: c.muted }]}>取消</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleAddSingle}
                      disabled={!singleWordInput.trim()}
                      style={({ pressed }) => [styles.modalButton, { backgroundColor: c.primary }, !singleWordInput.trim() && { backgroundColor: c.border }, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={[styles.modalConfirmText, { color: c.isDark ? "#1C1C1E" : "#FFF" }, !singleWordInput.trim() && { color: c.muted }]}>添加</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <TextInput
                    style={[styles.modalInput, styles.batchInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.foreground }]}
                    placeholder="每行一个词语，或用逗号/顿号分隔"
                    placeholderTextColor={c.muted}
                    value={batchWordInput}
                    onChangeText={setBatchWordInput}
                    multiline
                    autoFocus
                  />
                  <View style={styles.modalButtons}>
                    <Pressable onPress={() => setShowAddModal(false)} style={({ pressed }) => [styles.modalButton, { backgroundColor: c.accentLight }, pressed && { opacity: 0.7 }]}>
                      <Text style={[styles.modalCancelText, { color: c.muted }]}>取消</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleAddBatch}
                      disabled={!batchWordInput.trim()}
                      style={({ pressed }) => [styles.modalButton, { backgroundColor: c.primary }, !batchWordInput.trim() && { backgroundColor: c.border }, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={[styles.modalConfirmText, { color: c.isDark ? "#1C1C1E" : "#FFF" }, !batchWordInput.trim() && { color: c.muted }]}>批量添加</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* 移动词语弹窗 */}
      <Modal visible={showMoveModal} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: c.overlayBg }]} onPress={() => setShowMoveModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: c.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>移动到分类</Text>
            <Text style={[styles.moveWordLabel, { color: c.muted }]}>词语: {moveWordText}</Text>
            <ScrollView style={styles.moveCategoryList}>
              {otherCategories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => handleMoveToCategory(cat.id)}
                  style={({ pressed }) => [styles.moveCategoryItem, { backgroundColor: c.inputBg, borderColor: c.border }, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.moveCategoryName, { color: c.foreground }]}>{cat.name}</Text>
                  <Text style={[styles.moveCategoryCount, { color: c.muted }]}>{cat.words.length} 词</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setShowMoveModal(false)}
              style={({ pressed }) => [styles.modalButton, { backgroundColor: c.accentLight, marginTop: 12 }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.modalCancelText, { color: c.muted }]}>取消</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16 },
  backLink: { marginTop: 16 },
  backLinkText: { fontSize: 15 },
  topBar: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backButton: { paddingVertical: 8, paddingRight: 16 },
  backButtonText: { fontSize: 16 },
  header: { alignItems: "center", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "400", letterSpacing: 4 },
  subtitle: { marginTop: 6, fontSize: 14 },
  importResultBanner: { borderRadius: 8, padding: 12, marginBottom: 12, alignItems: "center", borderWidth: 1 },
  importResultText: { fontSize: 14 },
  actionBar: { flexDirection: "row", gap: 12, marginBottom: 16 },
  actionBarButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  actionBarButtonText: { fontSize: 14 },
  searchContainer: { marginBottom: 12 },
  searchInput: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, borderWidth: 1 },
  wordList: { paddingBottom: 40 },
  wordItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 0.5 },
  wordInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  wordText: { fontSize: 16 },
  systemBadge: { fontSize: 11, marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  wordActions: { flexDirection: "row", gap: 8 },
  wordActionButton: { paddingVertical: 6, paddingHorizontal: 10 },
  wordActionText: { fontSize: 13 },
  emptyText: { textAlign: "center", fontSize: 15, marginTop: 40 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  modalContent: { borderRadius: 16, padding: 24, width: "100%", maxWidth: 360 },
  modalTitle: { fontSize: 18, fontWeight: "500", marginBottom: 16, textAlign: "center" },
  modalInput: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, borderWidth: 1, marginBottom: 16 },
  batchInput: { minHeight: 120, textAlignVertical: "top" },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 24, alignItems: "center" },
  modalCancelText: { fontSize: 15 },
  modalConfirmText: { fontSize: 15 },
  modeSwitch: { flexDirection: "row", marginBottom: 16, borderRadius: 8, padding: 2 },
  modeSwitchButton: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 6 },
  modeSwitchText: { fontSize: 14 },
  moveWordLabel: { fontSize: 14, marginBottom: 12, textAlign: "center" },
  moveCategoryList: { maxHeight: 300 },
  moveCategoryItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1 },
  moveCategoryName: { fontSize: 15 },
  moveCategoryCount: { fontSize: 13 },
});
