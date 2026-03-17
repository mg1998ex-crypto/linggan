/**
 * 灵感主页面
 * 
 * 状态机:
 * idle → rolling → stopped → (保存后自动rolling) → stopped → ...
 * 5分钟计时器在首次"开始"时启动,持续倒计时直到归零
 * 
 * 新功能: 锁定词语部分重抽
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  Platform, Alert, FlatList, Modal, Keyboard,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { WordRoller } from "@/components/word-roller";
import { getRandomWords, getPartialRandomWords } from "@/lib/word-filter";
import { trpc } from "@/lib/trpc";
import { useWordLibrary } from "@/lib/word-library-context";
import { saveDraft, loadDraft, clearDraft, type Draft } from "@/lib/draft-storage";

type AppState = "idle" | "rolling" | "stopped" | "timeup";

const TOTAL_TIME = 5 * 60; // 5分钟

export default function HomeScreen() {
  const [state, setState] = useState<AppState>("idle");
  const [words, setWords] = useState<[string, string, string]>(["", "", ""]);
  const [content, setContent] = useState("");
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [lockedIndices, setLockedIndices] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [rollerStopCount, setRollerStopCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStarted = useRef(false);
  const draftLoaded = useRef(false);

  const { data: libraryData, getWordsForDrawing, setSelectedCategory, getVisibleCategories } = useWordLibrary();
  const createInspiration = trpc.inspirations.create.useMutation();

  const selectedCategoryId = libraryData?.selectedCategoryId || null;
  const visibleCategories = getVisibleCategories();
  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return "全部词库";
    const cat = visibleCategories.find((c) => c.id === selectedCategoryId);
    return cat ? cat.name : "全部词库";
  }, [selectedCategoryId, visibleCategories]);

  // 获取可用词语
  const availableWords = useMemo(() => getWordsForDrawing(), [libraryData, selectedCategoryId]);

  // 构建词语到分类的映射(用于同分类过滤)
  const categoryMap = useMemo(() => {
    if (!libraryData) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const cat of libraryData.categories) {
      if (!cat.isHidden) {
        for (const w of cat.words) {
          map.set(w.text, cat.id);
        }
      }
    }
    return map;
  }, [libraryData]);

  const canSave = content.trim().length > 0;

  // 加载草稿
  useEffect(() => {
    if (draftLoaded.current) return;
    draftLoaded.current = true;
    loadDraft().then((draft: Draft | null) => {
      if (draft && draft.word1 && draft.word2 && draft.word3) {
        setWords([draft.word1, draft.word2, draft.word3]);
        setContent(draft.content || "");
        setState("stopped");
      }
    });
  }, []);

  // 计时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = useCallback(() => {
    if (timerStarted.current) return;
    timerStarted.current = true;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setState("timeup");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // 自动保存草稿
  useEffect(() => {
    if (state === "stopped" && words[0]) {
      saveDraft({ word1: words[0], word2: words[1], word3: words[2], content, timestamp: Date.now() });
    }
  }, [state, words, content]);

  // 时间到后3秒回到初始状态
  useEffect(() => {
    if (state === "timeup") {
      clearDraft();
      const timer = setTimeout(() => {
        setState("idle");
        setWords(["", "", ""]);
        setContent("");
        setTimeLeft(TOTAL_TIME);
        timerStarted.current = false;
        setLockedIndices([false, false, false]);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // 开始抽词
  const handleStart = useCallback(() => {
    if (availableWords.length < 3) {
      const msg = "当前词库词语不足3个,请切换分类或添加更多词语";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("提示", msg);
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    startTimer();
    const isFilteredByCategory = !!selectedCategoryId;
    const newWords = getRandomWords(availableWords, 10, categoryMap, isFilteredByCategory);
    setWords(newWords);
    setContent("");
    setLockedIndices([false, false, false]);
    setRollerStopCount(0);
    setState("rolling");
  }, [availableWords, startTimer, selectedCategoryId, categoryMap]);

  // 换一组(支持锁定)
  const handleRestart = useCallback(() => {
    if (availableWords.length < 3) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Keyboard.dismiss();

    const hasLocked = lockedIndices.some((l) => l);
    const isFilteredByCategory = !!selectedCategoryId;

    let newWords: [string, string, string];
    if (hasLocked) {
      newWords = getPartialRandomWords(
        availableWords, words, lockedIndices, 10, categoryMap, isFilteredByCategory
      );
    } else {
      newWords = getRandomWords(availableWords, 10, categoryMap, isFilteredByCategory);
    }

    setWords(newWords);
    setContent("");
    setRollerStopCount(0);
    setState("rolling");
  }, [availableWords, words, lockedIndices, selectedCategoryId, categoryMap]);

  // 保存灵感
  const handleSave = useCallback(async () => {
    if (!canSave) return;

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      await createInspiration.mutateAsync({
        word1: words[0],
        word2: words[1],
        word3: words[2],
        content: content.trim(),
      });
    } catch (e) {
      console.error("保存失败:", e);
    }

    clearDraft();
    setSaveSuccess(true);
    setLockedIndices([false, false, false]);

    // 1.5秒后自动开始下一轮
    setTimeout(() => {
      setSaveSuccess(false);
      if (timeLeft > 0) {
        const isFilteredByCategory = !!selectedCategoryId;
        const newWords = getRandomWords(availableWords, 10, categoryMap, isFilteredByCategory);
        setWords(newWords);
        setContent("");
        setRollerStopCount(0);
        setState("rolling");
      } else {
        setState("idle");
      }
    }, 1500);
  }, [canSave, words, content, timeLeft, availableWords, selectedCategoryId, categoryMap, createInspiration]);

  // 单个roller停止回调
  const handleRollerStop = useCallback(() => {
    setRollerStopCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setState("stopped");
      }
      return next;
    });
  }, []);

  // 切换锁定
  const toggleLock = useCallback((index: number) => {
    setLockedIndices((prev) => {
      const next: [boolean, boolean, boolean] = [...prev];
      // 不允许锁定全部3个
      const lockedCount = next.filter((l) => l).length;
      if (!next[index] && lockedCount >= 2) {
        // 已锁定2个,不允许再锁定第3个
        return prev;
      }
      next[index] = !next[index];
      return next;
    });
  }, []);

  // 分类选择
  const handleSelectCategory = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setShowCategoryPicker(false);
  }, [setSelectedCategory]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/* 标题 + 计时器 */}
          <View style={styles.header}>
            <Text style={styles.title}>灵 感</Text>
            {state !== "idle" && state !== "timeup" && (
              <Text style={[
                styles.timer,
                timeLeft <= 60 && styles.timerWarning,
                timeLeft <= 10 && styles.timerExpired,
              ]}>
                {formatTime(timeLeft)}
              </Text>
            )}
          </View>

          {/* 时间到 */}
          {state === "timeup" && (
            <View style={styles.timeUpContainer}>
              <Text style={styles.timeUpTitle}>今日灵感时间结束</Text>
              <Text style={styles.timeUpSubtitle}>明天继续探索灵感</Text>
            </View>
          )}

          {/* 状态1: 初始状态 */}
          {state === "idle" && (
            <View style={styles.idleContainer}>
              {/* 分类筛选器 */}
              <Pressable
                onPress={() => setShowCategoryPicker(true)}
                style={({ pressed }) => [styles.categoryFilter, pressed && styles.filterPressed]}
              >
                <Text style={styles.categoryFilterText}>{selectedCategoryName}</Text>
                <Text style={styles.categoryFilterArrow}>▼</Text>
              </Pressable>

              <Pressable
                onPress={handleStart}
                style={({ pressed }) => [styles.startButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.startButtonText}>开 始</Text>
              </Pressable>
            </View>
          )}

          {/* 状态2: 动画播放中 */}
          {state === "rolling" && (
            <View style={styles.rollersContainer}>
              <WordRoller
                word={words[0]}
                isRolling={true}
                delay={1800}
                onStop={handleRollerStop}
                words={availableWords}
                isLocked={lockedIndices[0]}
              />
              <WordRoller
                word={words[1]}
                isRolling={true}
                delay={2200}
                onStop={handleRollerStop}
                words={availableWords}
                isLocked={lockedIndices[1]}
              />
              <WordRoller
                word={words[2]}
                isRolling={true}
                delay={2600}
                onStop={handleRollerStop}
                words={availableWords}
                isLocked={lockedIndices[2]}
              />
            </View>
          )}

          {/* 状态3: 抽词完成 */}
          {state === "stopped" && (
            <>
              {/* 三个词定格显示(带锁图标) */}
              <View style={styles.wordsDisplayContainer}>
                <WordRoller
                  word={words[0]}
                  isRolling={false}
                  delay={0}
                  words={availableWords}
                  isLocked={lockedIndices[0]}
                  onToggleLock={() => toggleLock(0)}
                  showLock={true}
                />
                <WordRoller
                  word={words[1]}
                  isRolling={false}
                  delay={0}
                  words={availableWords}
                  isLocked={lockedIndices[1]}
                  onToggleLock={() => toggleLock(1)}
                  showLock={true}
                />
                <WordRoller
                  word={words[2]}
                  isRolling={false}
                  delay={0}
                  words={availableWords}
                  isLocked={lockedIndices[2]}
                  onToggleLock={() => toggleLock(2)}
                  showLock={true}
                />
              </View>

              {saveSuccess && (
                <View style={styles.toastContainer}>
                  <Text style={styles.toastText}>灵感已保存,继续下一组...</Text>
                </View>
              )}

              {!saveSuccess && (
                <View style={styles.inputSection}>
                  <TextInput
                    style={styles.input}
                    placeholder="记录你的灵感点子..."
                    placeholderTextColor="#8A8A8A"
                    multiline
                    value={content}
                    onChangeText={setContent}
                    returnKeyType="done"
                  />

                  <View style={styles.actionButtons}>
                    <Pressable
                      onPress={handleRestart}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {lockedIndices.some((l) => l) ? "换未锁定" : "换一组"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={canSave ? handleSave : undefined}
                      disabled={!canSave}
                      style={({ pressed }) => [
                        styles.saveButton,
                        !canSave && styles.saveButtonDisabled,
                        pressed && canSave && styles.buttonPressed,
                      ]}
                    >
                      <Text style={[
                        styles.saveButtonText,
                        !canSave && styles.saveButtonTextDisabled,
                      ]}>
                        保存灵感
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* 分类筛选弹窗 */}
      <Modal visible={showCategoryPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCategoryPicker(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>选择词库分类</Text>
            <FlatList
              data={[{ id: null, name: "全部词库", count: availableWords.length }, ...visibleCategories.map((c) => ({ id: c.id, name: c.name, count: c.words.length }))]}
              keyExtractor={(item) => item.id || "all"}
              style={styles.categoryPickerList}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelectCategory(item.id)}
                  style={({ pressed }) => [
                    styles.categoryPickerItem,
                    (item.id === selectedCategoryId || (item.id === null && !selectedCategoryId)) && styles.categoryPickerItemActive,
                    pressed && styles.filterPressed,
                  ]}
                >
                  <Text style={[
                    styles.categoryPickerName,
                    (item.id === selectedCategoryId || (item.id === null && !selectedCategoryId)) && styles.categoryPickerNameActive,
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={styles.categoryPickerCount}>{item.count} 词</Text>
                </Pressable>
              )}
            />
            <Pressable
              onPress={() => setShowCategoryPicker(false)}
              style={({ pressed }) => [styles.modalCloseButton, pressed && styles.filterPressed]}
            >
              <Text style={styles.modalCloseText}>关闭</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 60 },
  header: { alignItems: "center", marginBottom: 60 },
  title: { fontSize: 32, fontWeight: "300", color: "#2C2C2C", letterSpacing: 8 },
  timer: { marginTop: 16, fontSize: 18, fontWeight: "400", color: "#5A5A5A", letterSpacing: 2 },
  timerWarning: { color: "#D4A574" },
  timerExpired: { color: "#C9A87C" },

  timeUpContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 120 },
  timeUpTitle: { fontSize: 22, fontWeight: "400", color: "#2C2C2C", letterSpacing: 4, marginBottom: 12 },
  timeUpSubtitle: { fontSize: 15, fontWeight: "300", color: "#8A8A8A", letterSpacing: 2 },

  /* 状态1: 初始状态 */
  idleContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 120 },

  /* 分类筛选器 */
  categoryFilter: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: "#FAFAFA", borderRadius: 20, marginBottom: 32,
    borderWidth: 1, borderColor: "#F0F0F0",
  },
  categoryFilterText: { fontSize: 14, color: "#5A5A5A", letterSpacing: 1 },
  categoryFilterArrow: { fontSize: 12, color: "#8A8A8A", marginLeft: 6 },
  filterPressed: { opacity: 0.7 },

  startButton: {
    paddingHorizontal: 64, paddingVertical: 20, backgroundColor: "#2C2C2C",
    borderRadius: 40, borderWidth: 1, borderColor: "#2C2C2C",
  },
  startButtonText: { fontSize: 18, fontWeight: "400", color: "#FFFFFF", letterSpacing: 6 },

  /* 状态2: 动画播放中 */
  rollersContainer: {
    flexDirection: "row", justifyContent: "center", alignItems: "flex-start",
    marginTop: 40, marginBottom: 40, gap: 8,
  },

  /* 状态3: 抽词完成 */
  wordsDisplayContainer: {
    flexDirection: "row", justifyContent: "center", alignItems: "flex-start",
    marginTop: 20, marginBottom: 24, gap: 8,
  },
  inputSection: { paddingHorizontal: 4, marginBottom: 40 },
  input: {
    backgroundColor: "#FAFAFA", borderRadius: 12, padding: 20, fontSize: 16,
    lineHeight: 24, minHeight: 160, textAlignVertical: "top", color: "#2C2C2C",
    borderWidth: 1, borderColor: "#F0F0F0",
  },
  actionButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, gap: 16 },
  secondaryButton: {
    flex: 1, paddingVertical: 16, backgroundColor: "#FFFFFF", borderRadius: 30,
    alignItems: "center", borderWidth: 1, borderColor: "#2C2C2C",
  },
  secondaryButtonText: { fontSize: 15, fontWeight: "400", color: "#2C2C2C", letterSpacing: 2 },
  saveButton: {
    flex: 1, paddingVertical: 16, backgroundColor: "#2C2C2C", borderRadius: 30,
    alignItems: "center", borderWidth: 1, borderColor: "#2C2C2C",
  },
  saveButtonText: { fontSize: 15, fontWeight: "400", color: "#FFFFFF", letterSpacing: 2 },
  saveButtonDisabled: { backgroundColor: "#FFFFFF", borderColor: "#E0E0E0" },
  saveButtonTextDisabled: { color: "#BDBDBD" },
  buttonPressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },

  toastContainer: { alignItems: "center", marginTop: 40 },
  toastText: { fontSize: 16, color: "#5A5A5A", letterSpacing: 2 },

  /* 分类选择弹窗 */
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center",
    alignItems: "center", paddingHorizontal: 32,
  },
  modalContent: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360,
    maxHeight: "70%",
  },
  modalTitle: { fontSize: 18, fontWeight: "500", color: "#2C2C2C", marginBottom: 16, textAlign: "center" },
  categoryPickerList: { maxHeight: 400 },
  categoryPickerItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, marginBottom: 6,
    backgroundColor: "#FAFAFA",
  },
  categoryPickerItemActive: { backgroundColor: "#2C2C2C" },
  categoryPickerName: { fontSize: 15, color: "#2C2C2C" },
  categoryPickerNameActive: { color: "#FFFFFF", fontWeight: "500" },
  categoryPickerCount: { fontSize: 13, color: "#8A8A8A" },
  modalCloseButton: {
    marginTop: 16, paddingVertical: 14, backgroundColor: "#F5F5F5",
    borderRadius: 24, alignItems: "center",
  },
  modalCloseText: { fontSize: 15, color: "#5A5A5A" },
});
