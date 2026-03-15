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

export default function LibraryScreen() {
  const router = useRouter();
  const lib = useWordLibrary();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageCategoryId, setManageCategoryId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  if (lib.loading || !lib.data) {
    return (
      <ScreenContainer className="bg-background">
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载词库中...</Text>
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
    if (categories.some((c) => c.name === name)) {
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
        item.isHidden && styles.categoryCardHidden,
        pressed && styles.cardPressed,
      ]}
    >
      <Text style={[styles.categoryName, item.isHidden && styles.categoryNameHidden]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={[styles.categoryCount, item.isHidden && styles.categoryCountHidden]}>
        {item.words.length} 词
      </Text>
      {item.isHidden && <Text style={styles.hiddenBadge}>已隐藏</Text>}
    </Pressable>
  );

  return (
    <ScreenContainer className="bg-background">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>词 库</Text>
          <Text style={styles.subtitle}>{stats.totalCategories} 个分类 · {stats.totalWords} 个词语</Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="搜索词语..."
            placeholderTextColor="#AFAFAF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.trim() !== "" && (
            <Pressable onPress={() => setSearchQuery("")} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>清除</Text>
            </Pressable>
          )}
        </View>

        {searchQuery.trim() !== "" ? (
          <View style={styles.searchResultsContainer}>
            <Text style={styles.searchResultsTitle}>找到 {searchResults.length} 个结果</Text>
            <FlatList
              data={searchResults.slice(0, 50)}
              keyExtractor={(item, index) => `${item.categoryId}-${item.word.text}-${index}`}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleCategoryPress(item.categoryId)}
                  style={({ pressed }) => [styles.searchResultItem, pressed && styles.cardPressed]}
                >
                  <Text style={styles.searchResultWord}>{item.word.text}</Text>
                  <Text style={styles.searchResultCategory}>{item.categoryName}</Text>
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<Text style={styles.emptyText}>没有找到匹配的词语</Text>}
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
                style={({ pressed }) => [styles.addCategoryCard, pressed && styles.cardPressed]}
              >
                <Text style={styles.addCategoryText}>+ 新建分类</Text>
              </Pressable>
            }
          />
        )}
      </View>

      {/* 创建分类弹窗 */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreateModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>新建分类</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="输入分类名称"
              placeholderTextColor="#AFAFAF"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateCategory}
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowCreateModal(false)}
                style={({ pressed }) => [styles.modalButton, styles.modalCancelButton, pressed && styles.cardPressed]}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </Pressable>
              <Pressable
                onPress={handleCreateCategory}
                disabled={!newCategoryName.trim()}
                style={({ pressed }) => [
                  styles.modalButton, styles.modalConfirmButton,
                  !newCategoryName.trim() && styles.modalButtonDisabled,
                  pressed && styles.cardPressed,
                ]}
              >
                <Text style={[styles.modalConfirmText, !newCategoryName.trim() && styles.modalConfirmTextDisabled]}>创建</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 管理分类弹窗 */}
      <Modal visible={showManageModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowManageModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>管理分类</Text>
            {manageCat && (
              <ScrollView style={styles.manageOptions}>
                <Pressable
                  onPress={handleToggleHidden}
                  style={({ pressed }) => [styles.manageOption, pressed && styles.cardPressed]}
                >
                  <Text style={styles.manageOptionText}>
                    {manageCat.isHidden ? "取消隐藏（恢复参与抽词）" : "隐藏分类（不参与抽词）"}
                  </Text>
                </Pressable>
                {!manageCat.isSystem && (
                  <>
                    <View style={styles.manageDivider} />
                    <View style={styles.renameSection}>
                      <Text style={styles.manageSectionTitle}>重命名</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={renameText}
                        onChangeText={setRenameText}
                        returnKeyType="done"
                        onSubmitEditing={handleRename}
                      />
                      <Pressable
                        onPress={handleRename}
                        style={({ pressed }) => [styles.renameButton, pressed && styles.cardPressed]}
                      >
                        <Text style={styles.renameButtonText}>确认重命名</Text>
                      </Pressable>
                    </View>
                    <View style={styles.manageDivider} />
                    <Pressable
                      onPress={handleDeleteCategory}
                      style={({ pressed }) => [styles.manageOption, pressed && styles.cardPressed]}
                    >
                      <Text style={[styles.manageOptionText, styles.deleteText]}>删除分类</Text>
                    </Pressable>
                  </>
                )}
              </ScrollView>
            )}
            <Pressable
              onPress={() => setShowManageModal(false)}
              style={({ pressed }) => [styles.modalButton, styles.modalCancelButton, { marginTop: 16 }, pressed && styles.cardPressed]}
            >
              <Text style={styles.modalCancelText}>关闭</Text>
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
  loadingText: { fontSize: 16, color: "#8A8A8A" },
  header: { alignItems: "center", marginBottom: 24 },
  title: { fontSize: 32, fontWeight: "300", color: "#2C2C2C", letterSpacing: 8 },
  subtitle: { marginTop: 8, fontSize: 14, color: "#8A8A8A", letterSpacing: 1 },
  searchContainer: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  searchInput: {
    flex: 1, backgroundColor: "#FAFAFA", borderRadius: 10, paddingHorizontal: 16,
    paddingVertical: 12, fontSize: 15, color: "#2C2C2C", borderWidth: 1, borderColor: "#F0F0F0",
  },
  clearButton: { marginLeft: 12, paddingVertical: 8, paddingHorizontal: 4 },
  clearButtonText: { fontSize: 14, color: "#8A8A8A" },
  searchResultsContainer: { flex: 1 },
  searchResultsTitle: { fontSize: 14, color: "#8A8A8A", marginBottom: 12 },
  searchResultItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 16, backgroundColor: "#FAFAFA",
    borderRadius: 10, marginBottom: 8,
  },
  searchResultWord: { fontSize: 16, fontWeight: "500", color: "#2C2C2C" },
  searchResultCategory: { fontSize: 13, color: "#8A8A8A" },
  emptyText: { textAlign: "center", fontSize: 15, color: "#AFAFAF", marginTop: 40 },
  categoryList: { paddingBottom: 40 },
  categoryRow: { justifyContent: "space-between", marginBottom: 12 },
  categoryCard: {
    width: "48%", backgroundColor: "#FAFAFA", borderRadius: 12,
    padding: 16, minHeight: 90, justifyContent: "space-between",
  },
  categoryCardHidden: { backgroundColor: "#F5F5F5", opacity: 0.6 },
  categoryName: { fontSize: 16, fontWeight: "500", color: "#2C2C2C", marginBottom: 8 },
  categoryNameHidden: { color: "#8A8A8A" },
  categoryCount: { fontSize: 13, color: "#8A8A8A" },
  categoryCountHidden: { color: "#AFAFAF" },
  hiddenBadge: { fontSize: 11, color: "#AFAFAF", marginTop: 4 },
  cardPressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  addCategoryCard: {
    width: "48%", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16,
    minHeight: 90, justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "#E0E0E0", borderStyle: "dashed",
  },
  addCategoryText: { fontSize: 15, color: "#8A8A8A" },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center",
    alignItems: "center", paddingHorizontal: 32,
  },
  modalContent: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360,
  },
  modalTitle: { fontSize: 18, fontWeight: "500", color: "#2C2C2C", marginBottom: 16, textAlign: "center" },
  modalInput: {
    backgroundColor: "#FAFAFA", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: "#2C2C2C", borderWidth: 1, borderColor: "#F0F0F0", marginBottom: 16,
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 24, alignItems: "center" },
  modalCancelButton: { backgroundColor: "#F5F5F5" },
  modalCancelText: { fontSize: 15, color: "#5A5A5A" },
  modalConfirmButton: { backgroundColor: "#2C2C2C" },
  modalConfirmText: { fontSize: 15, color: "#FFFFFF" },
  modalButtonDisabled: { backgroundColor: "#E0E0E0" },
  modalConfirmTextDisabled: { color: "#AFAFAF" },
  manageOptions: { maxHeight: 300 },
  manageOption: { paddingVertical: 14, paddingHorizontal: 4 },
  manageOptionText: { fontSize: 15, color: "#2C2C2C" },
  manageDivider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 4 },
  manageSectionTitle: { fontSize: 13, color: "#8A8A8A", marginBottom: 8 },
  renameSection: { paddingVertical: 8 },
  renameButton: { backgroundColor: "#2C2C2C", borderRadius: 20, paddingVertical: 10, alignItems: "center" },
  renameButtonText: { fontSize: 14, color: "#FFFFFF" },
  deleteText: { color: "#E74C3C" },
});
