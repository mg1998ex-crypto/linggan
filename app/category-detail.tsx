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

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const lib = useWordLibrary();

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
      <ScreenContainer className="bg-background">
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const category = lib.getCategory(id);
  if (!category) {
    return (
      <ScreenContainer className="bg-background">
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>分类不存在</Text>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>返回</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // 搜索过滤
  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) return category.words;
    const q = searchQuery.trim().toLowerCase();
    return category.words.filter((w) => w.text.toLowerCase().includes(q));
  }, [category.words, searchQuery]);

  // 添加单个词
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

  // 批量添加
  const handleAddBatch = () => {
    const text = batchWordInput.trim();
    if (!text) return;
    // 支持逗号、顿号、换行分隔
    const words = text.split(/[,，、\n\r]+/).map((w) => w.trim()).filter(Boolean);
    if (words.length === 0) return;
    const [added, skipped] = lib.addWords(id, words);
    setBatchWordInput("");
    const msg = `成功添加 ${added} 个词语${skipped > 0 ? `，${skipped} 个重复已跳过` : ""}`;
    if (Platform.OS === "web") alert(msg);
    else Alert.alert("添加完成", msg);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // 删除词语
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

  // 移动词语
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

  // 文件导入
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
        // Web: use fetch to read the file
        const response = await fetch(asset.uri);
        content = await response.text();
      } else {
        // Native: use FileSystem
        content = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      if (!content.trim()) {
        const msg = "文件内容为空";
        if (Platform.OS === "web") alert(msg);
        else Alert.alert("提示", msg);
        return;
      }

      // 解析词语: 支持逗号、顿号、换行、分号分隔
      const words = content
        .split(/[,，、\n\r;；]+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0 && w.length <= 10);

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

  // 其他分类列表(用于移动)
  const otherCategories = lib.data.categories.filter((c) => c.id !== id);

  const renderWordItem = ({ item }: { item: typeof category.words[0] }) => (
    <View style={styles.wordItem}>
      <View style={styles.wordInfo}>
        <Text style={styles.wordText}>{item.text}</Text>
        {item.isSystem && <Text style={styles.systemBadge}>内置</Text>}
      </View>
      <View style={styles.wordActions}>
        <Pressable
          onPress={() => handleMoveWord(item.text)}
          style={({ pressed }) => [styles.wordActionButton, pressed && styles.actionPressed]}
        >
          <Text style={styles.wordActionText}>移动</Text>
        </Pressable>
        <Pressable
          onPress={() => handleDeleteWord(item.text)}
          style={({ pressed }) => [styles.wordActionButton, pressed && styles.actionPressed]}
        >
          <Text style={[styles.wordActionText, styles.deleteActionText]}>删除</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScreenContainer className="bg-background">
      <View style={styles.container}>
        {/* 顶部导航 */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← 返回</Text>
          </Pressable>
        </View>

        {/* 分类标题 */}
        <View style={styles.header}>
          <Text style={styles.title}>{category.name}</Text>
          <Text style={styles.subtitle}>{category.words.length} 个词语</Text>
        </View>

        {/* 导入结果提示 */}
        {importResult && (
          <View style={styles.importResultBanner}>
            <Text style={styles.importResultText}>{importResult}</Text>
          </View>
        )}

        {/* 操作栏 */}
        <View style={styles.actionBar}>
          <Pressable
            onPress={() => { setAddMode("single"); setShowAddModal(true); }}
            style={({ pressed }) => [styles.actionBarButton, pressed && styles.actionPressed]}
          >
            <Text style={styles.actionBarButtonText}>添加词语</Text>
          </Pressable>
          <Pressable
            onPress={handleImportFile}
            style={({ pressed }) => [styles.actionBarButton, pressed && styles.actionPressed]}
          >
            <Text style={styles.actionBarButtonText}>导入文件</Text>
          </Pressable>
        </View>

        {/* 搜索框 */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="搜索词语..."
            placeholderTextColor="#B0B0B5"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>

        {/* 词语列表 */}
        <FlatList
          data={filteredWords}
          renderItem={renderWordItem}
          keyExtractor={(item, index) => `${item.text}-${index}`}
          contentContainerStyle={styles.wordList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? "没有匹配的词语" : "暂无词语，点击上方添加"}
            </Text>
          }
        />
      </View>

      {/* 添加词语弹窗 */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>添加词语</Text>

              {/* 切换单个/批量 */}
              <View style={styles.modeSwitch}>
                <Pressable
                  onPress={() => setAddMode("single")}
                  style={[styles.modeSwitchButton, addMode === "single" && styles.modeSwitchActive]}
                >
                  <Text style={[styles.modeSwitchText, addMode === "single" && styles.modeSwitchTextActive]}>
                    单个添加
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setAddMode("batch")}
                  style={[styles.modeSwitchButton, addMode === "batch" && styles.modeSwitchActive]}
                >
                  <Text style={[styles.modeSwitchText, addMode === "batch" && styles.modeSwitchTextActive]}>
                    批量添加
                  </Text>
                </Pressable>
              </View>

              {addMode === "single" ? (
                <>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="输入词语"
                    placeholderTextColor="#B0B0B5"
                    value={singleWordInput}
                    onChangeText={setSingleWordInput}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleAddSingle}
                  />
                  <View style={styles.modalButtons}>
                    <Pressable
                      onPress={() => setShowAddModal(false)}
                      style={({ pressed }) => [styles.modalButton, styles.modalCancelButton, pressed && styles.actionPressed]}
                    >
                      <Text style={styles.modalCancelText}>取消</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleAddSingle}
                      disabled={!singleWordInput.trim()}
                      style={({ pressed }) => [
                        styles.modalButton, styles.modalConfirmButton,
                        !singleWordInput.trim() && styles.modalButtonDisabled,
                        pressed && styles.actionPressed,
                      ]}
                    >
                      <Text style={[styles.modalConfirmText, !singleWordInput.trim() && styles.modalConfirmTextDisabled]}>
                        添加
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <TextInput
                    style={[styles.modalInput, styles.batchInput]}
                    placeholder="每行一个词语，或用逗号/顿号分隔"
                    placeholderTextColor="#B0B0B5"
                    value={batchWordInput}
                    onChangeText={setBatchWordInput}
                    multiline
                    autoFocus
                  />
                  <View style={styles.modalButtons}>
                    <Pressable
                      onPress={() => setShowAddModal(false)}
                      style={({ pressed }) => [styles.modalButton, styles.modalCancelButton, pressed && styles.actionPressed]}
                    >
                      <Text style={styles.modalCancelText}>取消</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleAddBatch}
                      disabled={!batchWordInput.trim()}
                      style={({ pressed }) => [
                        styles.modalButton, styles.modalConfirmButton,
                        !batchWordInput.trim() && styles.modalButtonDisabled,
                        pressed && styles.actionPressed,
                      ]}
                    >
                      <Text style={[styles.modalConfirmText, !batchWordInput.trim() && styles.modalConfirmTextDisabled]}>
                        批量添加
                      </Text>
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
        <Pressable style={styles.modalOverlay} onPress={() => setShowMoveModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>移动到分类</Text>
            <Text style={styles.moveWordLabel}>词语: {moveWordText}</Text>
            <ScrollView style={styles.moveCategoryList}>
              {otherCategories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => handleMoveToCategory(cat.id)}
                  style={({ pressed }) => [styles.moveCategoryItem, pressed && styles.actionPressed]}
                >
                  <Text style={styles.moveCategoryName}>{cat.name}</Text>
                  <Text style={styles.moveCategoryCount}>{cat.words.length} 词</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setShowMoveModal(false)}
              style={({ pressed }) => [styles.modalButton, styles.modalCancelButton, { marginTop: 12 }, pressed && styles.actionPressed]}
            >
              <Text style={styles.modalCancelText}>取消</Text>
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
  loadingText: { fontSize: 16, color: "#8E8E93" },
  backLink: { marginTop: 16 },
  backLinkText: { fontSize: 15, color: "#F5A623" },

  topBar: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backButton: { paddingVertical: 8, paddingRight: 16 },
  backButtonText: { fontSize: 16, color: "#8E8E93" },

  header: { alignItems: "center", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "400", color: "#2D2D2D", letterSpacing: 4 },
  subtitle: { marginTop: 6, fontSize: 14, color: "#8E8E93" },

  importResultBanner: {
    backgroundColor: "#FFF8EE", borderRadius: 8, padding: 12, marginBottom: 12, alignItems: "center",
    borderWidth: 1, borderColor: "#F5D9A8",
  },
  importResultText: { fontSize: 14, color: "#C48A1A" },

  actionBar: { flexDirection: "row", gap: 12, marginBottom: 16 },
  actionBarButton: {
    flex: 1, paddingVertical: 12, backgroundColor: "#FFF8EE", borderRadius: 10,
    alignItems: "center", borderWidth: 1, borderColor: "#F5D9A8",
  },
  actionBarButtonText: { fontSize: 14, color: "#C48A1A" },
  actionPressed: { opacity: 0.7 },

  searchContainer: { marginBottom: 12 },
  searchInput: {
    backgroundColor: "#FFFCF7", borderRadius: 10, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 15, color: "#2D2D2D", borderWidth: 1, borderColor: "#F0EDE8",
  },

  wordList: { paddingBottom: 40 },
  wordItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#F0EDE8",
  },
  wordInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  wordText: { fontSize: 16, color: "#2D2D2D" },
  systemBadge: { fontSize: 11, color: "#B0B0B5", marginLeft: 8, backgroundColor: "#FFF8EE", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  wordActions: { flexDirection: "row", gap: 8 },
  wordActionButton: { paddingVertical: 6, paddingHorizontal: 10 },
  wordActionText: { fontSize: 13, color: "#8E8E93" },
  deleteActionText: { color: "#E74C3C" },
  emptyText: { textAlign: "center", fontSize: 15, color: "#B0B0B5", marginTop: 40 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center",
    alignItems: "center", paddingHorizontal: 32,
  },
  modalContent: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360,
  },
  modalTitle: { fontSize: 18, fontWeight: "500", color: "#2D2D2D", marginBottom: 16, textAlign: "center" },
  modalInput: {
    backgroundColor: "#FFFCF7", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: "#2D2D2D", borderWidth: 1, borderColor: "#F0EDE8", marginBottom: 16,
  },
  batchInput: { minHeight: 120, textAlignVertical: "top" },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 24, alignItems: "center" },
  modalCancelButton: { backgroundColor: "#FFF8EE" },
  modalCancelText: { fontSize: 15, color: "#8E8E93" },
  modalConfirmButton: { backgroundColor: "#F5A623" },
  modalConfirmText: { fontSize: 15, color: "#FFFFFF" },
  modalButtonDisabled: { backgroundColor: "#F0EDE8" },
  modalConfirmTextDisabled: { color: "#B0B0B5" },

  modeSwitch: { flexDirection: "row", marginBottom: 16, backgroundColor: "#FFF8EE", borderRadius: 8, padding: 2 },
  modeSwitchButton: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 6 },
  modeSwitchActive: { backgroundColor: "#FFFFFF" },
  modeSwitchText: { fontSize: 14, color: "#8E8E93" },
  modeSwitchTextActive: { color: "#2D2D2D", fontWeight: "500" },

  moveWordLabel: { fontSize: 14, color: "#8E8E93", marginBottom: 12, textAlign: "center" },
  moveCategoryList: { maxHeight: 300 },
  moveCategoryItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 12, backgroundColor: "#FFFCF7",
    borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: "#F0EDE8",
  },
  moveCategoryName: { fontSize: 15, color: "#2D2D2D" },
  moveCategoryCount: { fontSize: 13, color: "#8E8E93" },
});
