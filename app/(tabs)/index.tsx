/**
 * 灵感主页面
 * 
 * 状态机:
 * idle → rolling → stopped → (保存后自动rolling) → stopped → ...
 * 5分钟计时器在首次"开始"时启动,持续倒计时直到归零
 * 5分钟到后用户继续抽词,从5:01开始继续计时(超时模式)
 * 
 * 功能: 锁定词语部分重抽 + 指定词随机组合 + 分类筛选
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  Platform, Alert, FlatList, Modal, Keyboard, Dimensions,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { WordRoller } from "@/components/word-roller";
import { getRandomWords, getPartialRandomWords, getRandomWord } from "@/lib/word-filter";
import { trpc } from "@/lib/trpc";
import { useWordLibrary } from "@/lib/word-library-context";
import { saveDraft, loadDraft, clearDraft, type Draft } from "@/lib/draft-storage";

type AppState = "idle" | "rolling" | "stopped" | "timeup";

const TOTAL_TIME = 5 * 60; // 5分钟
const SCREEN_WIDTH = Dimensions.get("window").width;

export default function HomeScreen() {
  const [state, setState] = useState<AppState>("idle");
  const [words, setWords] = useState<[string, string, string]>(["", "", ""]);
  const [content, setContent] = useState("");
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [lockedIndices, setLockedIndices] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [rollerStopCount, setRollerStopCount] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false); // 超时模式(5分钟到后继续)

  // 指定词功能
  const [showCustomWordInput, setShowCustomWordInput] = useState(false);
  const [customWord, setCustomWord] = useState("");

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

  // 清理计时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 计时器模式: 使用ref跟踪是否超时,避免嵌套setInterval
  const isOvertimeRef = useRef(false);

  // 统一的计时器tick函数
  const startCountdown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    isOvertimeRef.current = false;
    timerRef.current = setInterval(() => {
      if (isOvertimeRef.current) {
        // 超时模式: 正计时
        setTimeLeft((prev) => prev + 1);
      } else {
        // 倒计时模式
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // 倒计时结束,切换为超时模式
            isOvertimeRef.current = true;
            setIsOvertime(true);
            return TOTAL_TIME + 1; // 从5:01开始
          }
          return prev - 1;
        });
      }
    }, 1000);
  }, []);

  // 首次启动计时器
  const startTimer = useCallback(() => {
    if (timerStarted.current) return;
    timerStarted.current = true;
    setIsOvertime(false);
    isOvertimeRef.current = false;
    setTimeLeft(TOTAL_TIME);
    startCountdown();
  }, [startCountdown]);

  // 自动保存草稿
  useEffect(() => {
    if (state === "stopped" && words[0]) {
      saveDraft({ word1: words[0], word2: words[1], word3: words[2], content, timestamp: Date.now() });
    }
  }, [state, words, content]);

  // timeup状态不再使用(计时器到期后自动进入超时模式)
  // 保留此effect以防万一
  useEffect(() => {
    if (state === "timeup") {
      // 自动回到stopped状态继续使用
      setState("stopped");
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

  // 指定词开始抽词
  const handleCustomWordStart = useCallback(() => {
    const trimmed = customWord.trim();
    if (!trimmed) return;
    if (availableWords.length < 3) {
      const msg = "当前词库词语不足3个";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("提示", msg);
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Keyboard.dismiss();
    setShowCustomWordInput(false);

    startTimer();

    // 指定词放在第一位,随机匹配另外两个
    const word2 = getRandomWord(availableWords, [trimmed]);
    const word3 = getRandomWord(availableWords, [trimmed, word2]);
    const newWords: [string, string, string] = [trimmed, word2, word3];
    setWords(newWords);
    setContent("");
    // 指定词自动锁定
    setLockedIndices([true, false, false]);
    setRollerStopCount(0);
    setState("rolling");
    setCustomWord("");
  }, [customWord, availableWords, startTimer]);

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
      // 无论计时器是否到期,都继续下一轮
      const isFilteredByCategory = !!selectedCategoryId;
      const newWords = getRandomWords(availableWords, 10, categoryMap, isFilteredByCategory);
      setWords(newWords);
      setContent("");
      setRollerStopCount(0);
      setState("rolling");

      // 计时器已自动切换为超时模式,无需手动处理
    }, 1500);
  }, [canSave, words, content, availableWords, selectedCategoryId, categoryMap, createInspiration, isOvertime]);

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
                !isOvertime && timeLeft <= 60 && styles.timerWarning,
                !isOvertime && timeLeft <= 10 && styles.timerExpired,
                isOvertime && styles.timerOvertime,
              ]}>
                {isOvertime ? `+${formatTime(timeLeft - TOTAL_TIME)}` : formatTime(timeLeft)}
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

              {/* 指定词入口 */}
              <Pressable
                onPress={() => setShowCustomWordInput(true)}
                style={({ pressed }) => [styles.customWordLink, pressed && { opacity: 0.5 }]}
              >
                <MaterialIcons name="edit" size={16} color="#5A5A5A" />
                <Text style={styles.customWordLinkText}>指定一个词</Text>
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

      {/* 指定词输入弹窗 */}
      <Modal visible={showCustomWordInput} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => { setShowCustomWordInput(false); Keyboard.dismiss(); }}>
          <Pressable style={styles.customWordModal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>指定一个词</Text>
            <Text style={styles.customWordHint}>输入你想要的词,系统将随机匹配另外两个词</Text>
            <TextInput
              style={styles.customWordInput}
              placeholder="输入词语..."
              placeholderTextColor="#BDBDBD"
              value={customWord}
              onChangeText={setCustomWord}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={customWord.trim() ? handleCustomWordStart : undefined}
              maxLength={10}
            />
            <View style={styles.customWordActions}>
              <Pressable
                onPress={() => { setShowCustomWordInput(false); setCustomWord(""); Keyboard.dismiss(); }}
                style={({ pressed }) => [styles.customWordCancel, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.customWordCancelText}>取消</Text>
              </Pressable>
              <Pressable
                onPress={customWord.trim() ? handleCustomWordStart : undefined}
                disabled={!customWord.trim()}
                style={({ pressed }) => [
                  styles.customWordConfirm,
                  !customWord.trim() && styles.customWordConfirmDisabled,
                  pressed && customWord.trim() && { opacity: 0.7 },
                ]}
              >
                <Text style={[
                  styles.customWordConfirmText,
                  !customWord.trim() && styles.customWordConfirmTextDisabled,
                ]}>开始抽词</Text>
              </Pressable>
            </View>
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
  timerOvertime: { color: "#C9A87C", fontWeight: "300" },

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

  /* 指定词入口 */
  customWordLink: {
    flexDirection: "row", alignItems: "center", marginTop: 28, paddingVertical: 10, paddingHorizontal: 20,
    backgroundColor: "#F5F5F5", borderRadius: 20, borderWidth: 1, borderColor: "#E8E8E8",
  },
  customWordLinkText: { fontSize: 14, color: "#5A5A5A", letterSpacing: 1, marginLeft: 6, fontWeight: "400" },

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

  /* 弹窗通用 */
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

  /* 指定词弹窗 */
  customWordModal: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, width: "100%", maxWidth: 340,
  },
  customWordHint: { fontSize: 13, color: "#8A8A8A", textAlign: "center", marginBottom: 20, lineHeight: 18 },
  customWordInput: {
    backgroundColor: "#FAFAFA", borderRadius: 12, padding: 16, fontSize: 18,
    textAlign: "center", color: "#2C2C2C", borderWidth: 1, borderColor: "#F0F0F0",
    letterSpacing: 2,
  },
  customWordActions: { flexDirection: "row", marginTop: 20, gap: 12 },
  customWordCancel: {
    flex: 1, paddingVertical: 14, backgroundColor: "#F5F5F5", borderRadius: 24, alignItems: "center",
  },
  customWordCancelText: { fontSize: 15, color: "#5A5A5A" },
  customWordConfirm: {
    flex: 1, paddingVertical: 14, backgroundColor: "#2C2C2C", borderRadius: 24, alignItems: "center",
  },
  customWordConfirmDisabled: { backgroundColor: "#E0E0E0" },
  customWordConfirmText: { fontSize: 15, color: "#FFFFFF", fontWeight: "500" },
  customWordConfirmTextDisabled: { color: "#BDBDBD" },
});
