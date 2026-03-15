/**
 * 灵感生成主屏幕
 * 
 * 页面状态机:
 *   idle    - 初始状态:显示标题 + "开始"按钮,计时器未启动
 *   rolling - 动画播放中:卷轴滚动,按钮隐藏
 *   stopped - 抽词完成:词语 + 输入框 + 按钮全部显示
 * 
 * 计时器逻辑:
 *   - 5分钟计时器 = 整体使用时间(孙正义"每天5分钟找灵感")
 *   - 首次点击"开始"时启动,持续倒计时
 *   - 保存灵感后:显示Toast → 自动开始下一轮抽词,计时器不重置
 *   - "换一组"按钮:重新抽词,计时器不重置
 *   - 计时器归零:提示时间到,回到idle
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, Alert, ScrollView, Modal, FlatList } from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { WordRoller } from "@/components/word-roller";
import { getRandomWords } from "@/lib/word-filter";
import { saveDraft, loadDraft, clearDraft } from "@/lib/draft-storage";
import { trpc } from "@/lib/trpc";
import wordsData from "@/assets/data/words.json";
import { OnboardingGuide, checkOnboardingCompleted } from "@/components/onboarding-guide";
import { useWordLibrary } from "@/lib/word-library-context";

type AppState = "idle" | "rolling" | "stopped";

export default function HomeScreen() {
  const lib = useWordLibrary();

  // 核心状态
  const [appState, setAppState] = useState<AppState>("idle");
  const [words, setWords] = useState<[string, string, string]>(["", "", ""]);
  const [content, setContent] = useState("");
  const [stoppedCount, setStoppedCount] = useState(0);

  // 分类筛选
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // 计时器状态 — 5分钟整体使用时间
  const [timeLeft, setTimeLeft] = useState(300);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UI状态
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 检查是否首次启动
  useEffect(() => {
    checkOnboardingCompleted().then((completed) => {
      if (!completed) {
        setShowOnboarding(true);
      }
    });
  }, []);

  // 加载草稿 - 有草稿直接进入状态3(stopped)
  useEffect(() => {
    loadDraft().then((draft) => {
      if (draft && draft.word1 && draft.word2 && draft.word3) {
        setWords([draft.word1, draft.word2, draft.word3]);
        setContent(draft.content || "");
        setAppState("stopped");
        setStoppedCount(3);
        setTimeLeft(300);
        setTimerActive(true);
      }
    });
  }, []);

  // 自动保存草稿(stopped状态时)
  useEffect(() => {
    if (appState === "stopped" && words[0] && words[1] && words[2]) {
      saveDraft({
        word1: words[0],
        word2: words[1],
        word3: words[2],
        content,
        timestamp: Date.now(),
      });
    }
  }, [content, words, appState]);

  // 计时器逻辑
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerActive, timeLeft]);

  // 计时器归零处理
  useEffect(() => {
    if (timeLeft === 0 && !timerActive && appState !== "idle") {
      setTimeUp(true);
      setTimeout(() => {
        setTimeUp(false);
        clearDraft();
        setWords(["", "", ""]);
        setContent("");
        setAppState("idle");
        setStoppedCount(0);
        setTimeLeft(300);
      }, 3000);
    }
  }, [timeLeft, timerActive, appState]);

  // 获取当前可用词库
  const getAvailableWords = useCallback((): string[] => {
    if (!lib.loading && lib.data) {
      const words = lib.getWordsForDrawing();
      if (words.length >= 3) return words;
    }
    // fallback到原始词库
    return wordsData.words;
  }, [lib]);

  // 开始新一轮抽词(不重置计时器)
  const startNewRound = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    clearDraft();

    const availableWords = getAvailableWords();
    const newWords = getRandomWords(availableWords);
    setWords(newWords);
    setAppState("rolling");
    setStoppedCount(0);
    setContent("");
    setSaveSuccess(false);

    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }

    fallbackTimerRef.current = setTimeout(() => {
      setAppState("stopped");
      setStoppedCount(3);
    }, 4000);
  }, [getAvailableWords]);

  // 首次点击"开始"
  const handleFirstStart = useCallback(() => {
    setTimeLeft(300);
    setTimerActive(true);
    setTimeUp(false);
    startNewRound();
  }, [startNewRound]);

  // "换一组"按钮
  const handleRestart = useCallback(() => {
    startNewRound();
  }, [startNewRound]);

  // 单个卷轴停止回调
  const handleRollerStop = useCallback(() => {
    setStoppedCount((prevCount) => {
      const newCount = prevCount + 1;
      if (newCount === 3) {
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        setTimeout(() => {
          setAppState("stopped");
        }, 200);
      }
      return newCount;
    });
  }, []);

  // 保存灵感
  const createInspiration = trpc.inspirations.create.useMutation();

  const handleSave = useCallback(async () => {
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

      await clearDraft();
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
        startNewRound();
      }, 1500);
    } catch (error) {
      console.error("保存灵感失败:", error);
      if (Platform.OS === "web") {
        alert("保存失败,请重试");
      } else {
        Alert.alert("错误", "保存失败,请重试");
      }
    }
  }, [words, content, createInspiration, startNewRound]);

  // 分类筛选相关
  const selectedCategoryId = lib.data?.selectedCategoryId || null;
  const selectedCategoryName = selectedCategoryId
    ? lib.getCategory(selectedCategoryId)?.name || "全部词库"
    : "全部词库";
  const visibleCategories = lib.getVisibleCategories();

  const handleSelectCategory = (categoryId: string | null) => {
    lib.setSelectedCategory(categoryId);
    setShowCategoryPicker(false);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const canSave = content.trim().length > 0;
  const isRolling = appState === "rolling";
  const showTimer = appState !== "idle" && (timerActive || timeLeft === 0);
  const availableWords = getAvailableWords();

  return (
    <ScreenContainer className="bg-background">
      {/* 首次启动引导 */}
      <OnboardingGuide
        visible={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* 标题区域 */}
          <View style={styles.header}>
            <Text style={styles.title}>灵 感</Text>

            {showTimer && (
              <Text style={[
                styles.timer,
                timeLeft <= 60 && timeLeft > 0 && styles.timerWarning,
                timeLeft === 0 && styles.timerExpired,
              ]}>
                {timeLeft === 0 ? "时间到" : `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`}
              </Text>
            )}
          </View>

          {/* 时间到提示 */}
          {timeUp && (
            <View style={styles.timeUpContainer}>
              <Text style={styles.timeUpTitle}>今日灵感时间结束</Text>
              <Text style={styles.timeUpSubtitle}>明天再来继续探索吧</Text>
            </View>
          )}

          {/* ===== 状态1: 初始状态 ===== */}
          {appState === "idle" && !timeUp && (
            <View style={styles.idleContainer}>
              {/* 分类筛选器 */}
              <Pressable
                onPress={() => setShowCategoryPicker(true)}
                style={({ pressed }) => [styles.categoryFilter, pressed && styles.filterPressed]}
              >
                <Text style={styles.categoryFilterText}>{selectedCategoryName}</Text>
                <Text style={styles.categoryFilterArrow}>▾</Text>
              </Pressable>

              <Pressable
                onPress={handleFirstStart}
                style={({ pressed }) => [
                  styles.startButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.startButtonText}>开 始</Text>
              </Pressable>
            </View>
          )}

          {/* ===== 状态2: 动画播放中 ===== */}
          {appState === "rolling" && !timeUp && (
            <View style={styles.rollersContainer}>
              <WordRoller
                word={words[0]}
                isRolling={isRolling}
                delay={1800}
                onStop={handleRollerStop}
                words={availableWords}
              />
              <WordRoller
                word={words[1]}
                isRolling={isRolling}
                delay={2100}
                onStop={handleRollerStop}
                words={availableWords}
              />
              <WordRoller
                word={words[2]}
                isRolling={isRolling}
                delay={2400}
                onStop={handleRollerStop}
                words={availableWords}
              />
            </View>
          )}

          {/* ===== 状态3: 抽词完成 ===== */}
          {appState === "stopped" && !timeUp && (
            <>
              {/* 三个词定格显示 */}
              <View style={styles.wordsDisplayContainer}>
                <WordRoller
                  word={words[0]}
                  isRolling={false}
                  delay={0}
                  words={availableWords}
                />
                <WordRoller
                  word={words[1]}
                  isRolling={false}
                  delay={0}
                  words={availableWords}
                />
                <WordRoller
                  word={words[2]}
                  isRolling={false}
                  delay={0}
                  words={availableWords}
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
                      <Text style={styles.secondaryButtonText}>换一组</Text>
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
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    marginTop: 40, marginBottom: 40, gap: 8,
  },

  /* 状态3: 抽词完成 */
  wordsDisplayContainer: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    marginTop: 20, marginBottom: 32, gap: 8,
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
