/**
 * 词库管理主页面
 * 分类网格展示 + 搜索 + 创建/管理分类
 */

import { useState } from "react";
import {
  View, Text, FlatList, Pressable, TextInput, StyleSheet,
  Platform, Alert, Modal, ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useWordLibrary } from "@/lib/word-library-context";
import { useThemeColors } from "@/hooks/use-theme-colors";

export default function LibraryScreen() {
  const router = useRouter();
  const lib = useWordLibrary();
  const c = useThemeColors();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageCategoryId, setManageCategoryId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  if (lib.loading || !lib.data) {
    return (
      <ScreenContainer>
        <View style={[styles.loadingContainer, { backgroundColor: c.background }]}>
          <Text style={[styles.loadingText, { color: c.muted }]}>加载词库中...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const categories = lib.data.categories;
  const stats = lib.getStats();
  const searchResults = searchQuery.trim() ? lib.searchWords(searchQuery) : [];

  const handleCategoryPress = (categoryId: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/category-detail", params: { id: categoryId } });
  };

  const handleCategoryLongPress = (categoryId: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cat = lib.getCategory(categoryId);
    if (!cat) return;
    setManageCategoryId(categoryId);
    setRenameText(cat.name);
    setShowManageModal(true);
  };

  const handleCreateCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.some((ct) => ct.name === name)) {
      if (Platform.OS === "web") alert("分类名称已存在");
      else Alert.alert("提示", "分类名称已存在");
      return;
    }
    lib.createCategory(name);
    setNewCategoryName("");
    setShowCreateModal(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const manageCat = manageCategoryId ? lib.getCategory(manageCategoryId) : null;

  const handleRename = () => {
    if (!manageCategoryId || !renameText.trim()) return;
    lib.renameCategory(manageCategoryId, renameText.trim());
    setShowManageModal(false);
  };

  const handleDeleteCategory = () => {
    if (!manageCategoryId) return;
    const doDelete = () => { lib.deleteCategory(manageCategoryId); setShowManageModal(false); };
    if (Platform.OS === "web") {
      if (confirm("删除此分类？词语将移入'其他'分类")) doDelete();
    } else {
      Alert.alert("删除分类", "删除此分类？词语将移入'其他'分类", [
        { text: "取消", style: "cancel" },
        { text: "删除", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const handleToggleHidden = () => {
    if (!manageCategoryId) return;
    lib.toggleCategoryHidden(manageCategoryId);
    setShowManageModal(false);
  };

  const renderCategoryCard = ({ item }: { item: typeof categories[0] }) => (
    <Pressable
      onPress={() => handleCategoryPress(item.id)}
      onLongPress={() => handleCategoryLongPress(item.id)}
      style={({ pressed }) => [
        styles.categoryCard,
        { backgroundColor: c.cardBg, borderColor: c.border },
        item.isHidden && { opacity: 0.5 },
        pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
      ]}
    >
      <Text style={[styles.categoryName, { color: c.foreground }, item.isHidden && { color: c.muted }]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={[styles.categoryCount, { color: c.accentDark }]}>
        {item.words.length} 词
      </Text>
      {item.isHidden && <Text style={[styles.hiddenBadge, { color: c.muted }]}>已隐藏</Text>}
    </Pressable>
  );

  return (
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.foreground }]}>词 库</Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>{stats.totalCategories} 个分类 · {stats.totalWords} 个词语</Text>
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
          {searchQuery.trim() !== "" && (
            <Pressable onPress={() => setSearchQuery("")} style={styles.clearButton}>
              <Text style={[styles.clearButtonText, { color: c.muted }]}>清除</Text>
            </Pressable>
          )}
        </View>

        {searchQuery.trim() !== "" ? (
          <View style={styles.searchResultsContainer}>
            <Text style={[styles.searchResultsTitle, { color: c.muted }]}>找到 {searchResults.length} 个结果</Text>
            <FlatList
              data={searchResults.slice(0, 50)}
              keyExtractor={(item, index) => `${item.categoryId}-${item.word.text}-${index}`}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleCategoryPress(item.categoryId)}
                  style={({ pressed }) => [styles.searchResultItem, { backgroundColor: c.inputBg, borderColor: c.border }, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.searchResultWord, { color: c.foreground }]}>{item.word.text}</Text>
                  <Text style={[styles.searchResultCategory, { color: c.muted }]}>{item.categoryName}</Text>
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: c.muted }]}>没有找到匹配的词语</Text>}
            />
          </View>
        ) : (
          <FlatList
            data={categories}
            renderItem={renderCategoryCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.categoryRow}
            contentContainerStyle={styles.categoryList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <Pressable
                onPress={() => setShowCreateModal(true)}
                style={({ pressed }) => [styles.addCategoryCard, { backgroundColor: c.accentLight, borderColor: c.isDark ? c.border : "#F5D9A8" }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.addCategoryText, { color: c.primary }]}>+ 新建分类</Text>
              </Pressable>
            }
          />
        )}
      </View>

      {/* 创建分类弹窗 */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: c.overlayBg }]} onPress={() => setShowCreateModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: c.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>新建分类</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.foreground }]}
              placeholder="输入分类名称"
              placeholderTextColor={c.muted}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateCategory}
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowCreateModal(false)}
                style={({ pressed }) => [styles.modalButton, { backgroundColor: c.accentLight }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.modalCancelText, { color: c.muted }]}>取消</Text>
              </Pressable>
              <Pressable
                onPress={handleCreateCategory}
                disabled={!newCategoryName.trim()}
                style={({ pressed }) => [
                  styles.modalButton, { backgroundColor: c.primary },
                  !newCategoryName.trim() && { backgroundColor: c.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.modalConfirmText, { color: c.isDark ? "#1C1C1E" : "#FFFFFF" }, !newCategoryName.trim() && { color: c.muted }]}>创建</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 管理分类弹窗 */}
      <Modal visible={showManageModal} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: c.overlayBg }]} onPress={() => setShowManageModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: c.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>管理分类</Text>
            {manageCat && (
              <ScrollView style={styles.manageOptions}>
                <Pressable
                  onPress={handleToggleHidden}
                  style={({ pressed }) => [styles.manageOption, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.manageOptionText, { color: c.foreground }]}>
                    {manageCat.isHidden ? "取消隐藏（恢复参与抽词）" : "隐藏分类（不参与抽词）"}
                  </Text>
                </Pressable>
                {!manageCat.isSystem && (
                  <>
                    <View style={[styles.manageDivider, { backgroundColor: c.border }]} />
                    <View style={styles.renameSection}>
                      <Text style={[styles.manageSectionTitle, { color: c.muted }]}>重命名</Text>
                      <TextInput
                        style={[styles.modalInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.foreground }]}
                        value={renameText}
                        onChangeText={setRenameText}
                        returnKeyType="done"
                        onSubmitEditing={handleRename}
                      />
                      <Pressable
                        onPress={handleRename}
                        style={({ pressed }) => [styles.renameButton, { backgroundColor: c.primary }, pressed && { opacity: 0.7 }]}
                      >
                        <Text style={[styles.renameButtonText, { color: c.isDark ? "#1C1C1E" : "#FFFFFF" }]}>确认重命名</Text>
                      </Pressable>
                    </View>
                    <View style={[styles.manageDivider, { backgroundColor: c.border }]} />
                    <Pressable
                      onPress={handleDeleteCategory}
                      style={({ pressed }) => [styles.manageOption, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={[styles.manageOptionText, { color: c.error }]}>删除分类</Text>
                    </Pressable>
                  </>
                )}
              </ScrollView>
            )}
            <Pressable
              onPress={() => setShowManageModal(false)}
              style={({ pressed }) => [styles.modalButton, { backgroundColor: c.accentLight, marginTop: 16 }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.modalCancelText, { color: c.muted }]}>关闭</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 60 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16 },
  header: { alignItems: "center", marginBottom: 24 },
  title: { fontSize: 32, fontWeight: "300", letterSpacing: 8 },
  subtitle: { marginTop: 8, fontSize: 14, letterSpacing: 1 },
  searchContainer: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  searchInput: {
    flex: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, borderWidth: 1,
  },
  clearButton: { marginLeft: 12, paddingVertical: 8, paddingHorizontal: 12 },
  clearButtonText: { fontSize: 14 },
  searchResultsContainer: { flex: 1 },
  searchResultsTitle: { fontSize: 14, marginBottom: 12 },
  searchResultItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, marginBottom: 8, borderWidth: 1,
  },
  searchResultWord: { fontSize: 16, fontWeight: "500" },
  searchResultCategory: { fontSize: 13 },
  emptyText: { textAlign: "center", fontSize: 15, marginTop: 40 },
  categoryList: { paddingBottom: 40 },
  categoryRow: { justifyContent: "space-between", marginBottom: 12 },
  categoryCard: {
    width: "48%", borderRadius: 12, padding: 16, minHeight: 90,
    justifyContent: "space-between", borderWidth: 1,
  },
  categoryName: { fontSize: 16, fontWeight: "500", marginBottom: 8 },
  categoryCount: { fontSize: 13 },
  hiddenBadge: { fontSize: 11, marginTop: 4 },
  addCategoryCard: {
    width: "48%", borderRadius: 12, padding: 16, minHeight: 90,
    justifyContent: "center", alignItems: "center", borderWidth: 1, borderStyle: "dashed",
  },
  addCategoryText: { fontSize: 15 },
  modalOverlay: {
    flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32,
  },
  modalContent: { borderRadius: 16, padding: 24, width: "100%", maxWidth: 360 },
  modalTitle: { fontSize: 18, fontWeight: "500", marginBottom: 16, textAlign: "center" },
  modalInput: {
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, borderWidth: 1, marginBottom: 16,
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 24, alignItems: "center" },
  modalCancelText: { fontSize: 15 },
  modalConfirmText: { fontSize: 15 },
  manageOptions: { maxHeight: 300 },
  manageOption: { paddingVertical: 14, paddingHorizontal: 4 },
  manageOptionText: { fontSize: 15 },
  manageDivider: { height: 1, marginVertical: 4 },
  manageSectionTitle: { fontSize: 13, marginBottom: 8 },
  renameSection: { paddingVertical: 8 },
  renameButton: { borderRadius: 20, paddingVertical: 10, alignItems: "center" },
  renameButtonText: { fontSize: 14 },
});
