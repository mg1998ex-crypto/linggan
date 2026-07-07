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
import { useWordLibrary } from "@/lib/word-library-context";
import { useInspirations } from "@/lib/inspiration-context";
import { saveDraft, loadDraft, clearDraft, type Draft } from "@/lib/draft-storage";
import { useThemeColors } from "@/hooks/use-theme-colors";

type AppState = "idle" | "rolling" | "stopped" | "timeup";

const TOTAL_TIME = 5 * 60; // 5分钟
const SCREEN_WIDTH = Dimensions.get("window").width;
const CONTENT_WIDTH = Math.min(SCREEN_WIDTH - 40, 560);
const TOP_CARD_WIDTH = Math.min(280, CONTENT_WIDTH - 72);
const BOTTOM_CARD_WIDTH = (CONTENT_WIDTH - 16) / 2;

export default function HomeScreen() {
  const c = useThemeColors();
  const [state, setState] = useState<AppState>("idle");
  const [words, setWords] = useState<[string, string, string]>(["", "", ""]);
  const [content, setContent] = useState("");
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [lockedIndices, setLockedIndices] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [rollerStopCount, setRollerStopCount] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  const [timerActive, setTimerActive] = useState(false);

  // 指定词功能
  const [showCustomWordInput, setShowCustomWordInput] = useState(false);
  const [customWord, setCustomWord] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isOvertimeRef = useRef(false);
  const draftLoaded = useRef(false);

  const { data: libraryData, getWordsForDrawing, setSelectedCategory, getVisibleCategories } = useWordLibrary();
  const { addInspiration } = useInspirations();

  const selectedCategoryId = libraryData?.selectedCategoryId || null;
  const visibleCategories = getVisibleCategories();
  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return "全部词库";
    const cat = visibleCategories.find((vc) => vc.id === selectedCategoryId);
    return cat ? cat.name : "全部词库";
  }, [selectedCategoryId, visibleCategories]);

  const availableWords = useMemo(() => getWordsForDrawing(), [libraryData, selectedCategoryId]);

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

  // 用显式运行状态驱动计时器，确保 Web 端开始和重新抽词都能可靠启动。
  useEffect(() => {
    if (!timerActive) return;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (isOvertimeRef.current) {
        setTimeLeft((prev) => prev + 1);
      } else {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            isOvertimeRef.current = true;
            setIsOvertime(true);
            return TOTAL_TIME + 1;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerActive]);

  const startTimer = useCallback(() => {
    if (timerActive) return;
    setIsOvertime(false);
    isOvertimeRef.current = false;
    setTimeLeft(TOTAL_TIME);
    setTimerActive(true);
  }, [timerActive]);

  // 自动保存草稿
  useEffect(() => {
    if (state === "stopped" && words[0]) {
      saveDraft({ word1: words[0], word2: words[1], word3: words[2], content, timestamp: Date.now() });
    }
  }, [state, words, content]);

  useEffect(() => {
    if (state === "timeup") {
      setState("stopped");
    }
  }, [state]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const handleStart = useCallback(() => {
    if (availableWords.length < 3) {
      const msg = "当前词库词语不足3个,请切换分类或添加更多词语";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("提示", msg);
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startTimer();
    const isFilteredByCategory = !!selectedCategoryId;
    const newWords = getRandomWords(availableWords, 10, categoryMap, isFilteredByCategory);
    setWords(newWords);
    setContent("");
    setLockedIndices([false, false, false]);
    setRollerStopCount(0);
    setState("rolling");
  }, [availableWords, startTimer, selectedCategoryId, categoryMap]);

  const handleCustomWordStart = useCallback(() => {
    const trimmed = customWord.trim();
    if (!trimmed) return;
    if (availableWords.length < 3) {
      const msg = "当前词库词语不足3个";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("提示", msg);
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    setShowCustomWordInput(false);
    startTimer();
    const word2 = getRandomWord(availableWords, [trimmed]);
    const word3 = getRandomWord(availableWords, [trimmed, word2]);
    const newWords: [string, string, string] = [trimmed, word2, word3];
    setWords(newWords);
    setContent("");
    setLockedIndices([true, false, false]);
    setRollerStopCount(0);
    setState("rolling");
    setCustomWord("");
  }, [customWord, availableWords, startTimer]);

  const handleRestart = useCallback(() => {
    if (availableWords.length < 3) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    startTimer();
    const hasLocked = lockedIndices.some((l) => l);
    const isFilteredByCategory = !!selectedCategoryId;
    let newWords: [string, string, string];
    if (hasLocked) {
      newWords = getPartialRandomWords(availableWords, words, lockedIndices, 10, categoryMap, isFilteredByCategory);
    } else {
      newWords = getRandomWords(availableWords, 10, categoryMap, isFilteredByCategory);
    }
    setWords(newWords);
    setContent("");
    setRollerStopCount(0);
    setState("rolling");
  }, [availableWords, words, lockedIndices, selectedCategoryId, categoryMap, startTimer]);

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await addInspiration({
        word1: words[0], word2: words[1], word3: words[2], content: content.trim(),
      });
    } catch (e) {
      console.error("保存失败:", e);
    }
    clearDraft();
    setSaveSuccess(true);
    setLockedIndices([false, false, false]);
    setTimeout(() => {
      setSaveSuccess(false);
      const isFilteredByCategory = !!selectedCategoryId;
      const newWords = getRandomWords(availableWords, 10, categoryMap, isFilteredByCategory);
      setWords(newWords);
      setContent("");
      setRollerStopCount(0);
      setState("rolling");
    }, 1500);
  }, [canSave, words, content, availableWords, selectedCategoryId, categoryMap, addInspiration]);

  const handleRollerStop = useCallback(() => {
    setRollerStopCount((prev) => {
      const next = prev + 1;
      if (next >= 3) setState("stopped");
      return next;
    });
  }, []);

  const toggleLock = useCallback((index: number) => {
    setLockedIndices((prev) => {
      const next: [boolean, boolean, boolean] = [...prev];
      const lockedCount = next.filter((l) => l).length;
      if (!next[index] && lockedCount >= 2) return prev;
      next[index] = !next[index];
      return next;
    });
  }, []);

  const handleSelectCategory = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setShowCategoryPicker(false);
  }, [setSelectedCategory]);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: c.background }}
      >
        <View style={[styles.container, { backgroundColor: c.background, width: CONTENT_WIDTH }]}>
          {/* 品牌与方法 */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: c.foreground }]}>灵感</Text>
              <Text style={[styles.tagline, { color: c.muted }]}>随机组合，强制关联</Text>
            </View>
            <View style={[styles.methodBadge, { backgroundColor: c.accentLight }]}>
              <Text style={[styles.methodBadgeText, { color: c.accentDark }]}>三词组合法</Text>
            </View>
          </View>

          <View style={styles.contextRow}>
            <Pressable onPress={() => setShowCategoryPicker(true)} style={styles.contextButton}>
              <Text style={[styles.contextLabel, { color: c.muted }]}>{selectedCategoryName}</Text>
              <MaterialIcons name="expand-more" size={17} color={c.muted} />
            </Pressable>
            {state !== "idle" ? (
              <Text style={[
                styles.timer, { color: c.accentDark },
                !isOvertime && timeLeft <= 10 && { color: c.error },
              ]}>
                {isOvertime ? `+${formatTime(timeLeft - TOTAL_TIME)}` : formatTime(timeLeft)}
              </Text>
            ) : (
              <Text style={[styles.contextHint, { color: c.muted }]}>今日三词</Text>
            )}
          </View>

          {/* 状态1: 初始状态 */}
          {state === "idle" && (
            <View style={styles.idleContainer}>
              <Text style={[styles.idleTitle, { color: c.foreground }]}>让不相关的词发生关系</Text>
              <Text style={[styles.idleSubtitle, { color: c.muted }]}>五分钟，写下你的第一直觉</Text>
              <Pressable
                onPress={handleStart}
                android_ripple={{ color: "rgba(255,255,255,0.18)" }}
                style={[
                  styles.startButton,
                  { backgroundColor: c.primary, borderColor: c.primary },
                ]}
              >
                <Text style={styles.startButtonText}>开始 · 生成三个词</Text>
              </Pressable>

              <View style={styles.idleDiagram}>
                <View style={[styles.idleCard, styles.idleTopCard, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                  <Text style={[styles.idleNumber, { color: c.error }]}>随机词  01</Text>
                </View>
                <View style={styles.idleBottomRow}>
                  <View style={[styles.idleCard, styles.idleBottomCard, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                    <Text style={[styles.idleNumber, { color: c.accentDark }]}>随机词  02</Text>
                  </View>
                  <View style={[styles.idleCard, styles.idleBottomCard, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                    <Text style={[styles.idleNumber, { color: c.primary }]}>随机词  03</Text>
                  </View>
                </View>
                <View style={[styles.idleHub, { backgroundColor: c.primary }]} />
              </View>
              <Pressable
                onPress={() => setShowCustomWordInput(true)}
                style={({ pressed }) => [
                  styles.customWordLink,
                  { backgroundColor: c.accentLight, borderColor: c.badgeBg },
                  pressed && { opacity: 0.5 },
                ]}
              >
                <MaterialIcons name="edit" size={16} color={c.accentDark} />
                <Text style={[styles.customWordLinkText, { color: c.accentDark }]}>指定一个词</Text>
              </Pressable>
            </View>
          )}

          {/* 抽词动画与最终三角阵使用同一套布局 */}
          {(state === "rolling" || state === "stopped") && (
            <View style={styles.constellation}>
              <View style={styles.topCardSlot}>
                <WordRoller
                  card label="随机词  01" cardWidth={TOP_CARD_WIDTH} cardHeight={150}
                  word={words[0]} isRolling={state === "rolling"} delay={1800}
                  onStop={handleRollerStop} words={availableWords} isLocked={lockedIndices[0]}
                  onToggleLock={() => toggleLock(0)} showLock={state === "stopped"} colors={c}
                />
              </View>
              <View style={[styles.connectorVertical, { backgroundColor: c.border }]} />
              <View style={[styles.connectorLeft, { backgroundColor: c.border }]} />
              <View style={[styles.connectorRight, { backgroundColor: c.border }]} />
              <View style={[styles.hubOuter, { borderColor: c.border, backgroundColor: c.background }]}>
                <View style={[styles.hubInner, { backgroundColor: c.primary }]} />
              </View>
              <View style={styles.bottomCardRow}>
                <WordRoller
                  card label="随机词  02" cardWidth={BOTTOM_CARD_WIDTH} cardHeight={166}
                  word={words[1]} isRolling={state === "rolling"} delay={2200}
                  onStop={handleRollerStop} words={availableWords} isLocked={lockedIndices[1]}
                  onToggleLock={() => toggleLock(1)} showLock={state === "stopped"} colors={c}
                />
                <WordRoller
                  card label="随机词  03" cardWidth={BOTTOM_CARD_WIDTH} cardHeight={166}
                  word={words[2]} isRolling={state === "rolling"} delay={2600}
                  onStop={handleRollerStop} words={availableWords} isLocked={lockedIndices[2]}
                  onToggleLock={() => toggleLock(2)} showLock={state === "stopped"} colors={c}
                />
              </View>
            </View>
          )}

          {/* 状态3: 抽词完成 */}
          {state === "stopped" && (
            <>
              {saveSuccess && (
                <View style={styles.toastContainer}>
                  <Text style={[styles.toastText, { color: c.primary }]}>灵感已保存,继续下一组...</Text>
                </View>
              )}

              {!saveSuccess && (
                <View style={styles.inputSection}>
                  <Text style={[styles.promptTitle, { color: c.foreground }]}>让不相关的词发生关系</Text>
                  <Text style={[styles.promptSubtitle, { color: c.muted }]}>先写下第一直觉，不必急着让它合理。</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.foreground }]}
                    placeholder="如果这三个词组成一个产品、服务或故事……"
                    placeholderTextColor={c.muted}
                    multiline
                    value={content}
                    onChangeText={setContent}
                    returnKeyType="done"
                  />
                  <Pressable
                    onPress={canSave ? handleSave : undefined}
                    disabled={!canSave}
                    style={({ pressed }) => [
                      styles.saveButton,
                      { backgroundColor: c.error, borderColor: c.error },
                      !canSave && { backgroundColor: c.surface, borderColor: c.border },
                      pressed && canSave && { opacity: 0.8, transform: [{ scale: 0.99 }] },
                    ]}
                  >
                    <Text style={[
                      styles.saveButtonText,
                      { color: "#FFFFFF" },
                      !canSave && { color: c.muted },
                    ]}>保存这条灵感</Text>
                  </Pressable>
                  <View style={styles.actionButtons}>
                    <Pressable
                      onPress={handleRestart}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        { backgroundColor: c.surface, borderColor: c.primary },
                        pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
                      ]}
                    >
                      <Text style={[styles.secondaryButtonText, { color: c.primary }]}>
                        {lockedIndices.some((l) => l) ? "换未锁定" : "换一组"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowCustomWordInput(true)}
                      style={({ pressed }) => [styles.secondaryButton, { backgroundColor: c.surface, borderColor: c.border }, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={[styles.secondaryButtonText, { color: c.foreground }]}>指定一个词</Text>
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
        <Pressable style={[styles.modalOverlay, { backgroundColor: c.overlayBg }]} onPress={() => setShowCategoryPicker(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: c.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>选择词库分类</Text>
            <FlatList
              data={[{ id: null, name: "全部词库", count: availableWords.length }, ...visibleCategories.map((vc) => ({ id: vc.id, name: vc.name, count: vc.words.length }))]}
              keyExtractor={(item) => item.id || "all"}
              style={styles.categoryPickerList}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelectCategory(item.id)}
                  style={({ pressed }) => [
                    styles.categoryPickerItem,
                    { backgroundColor: c.inputBg },
                    (item.id === selectedCategoryId || (item.id === null && !selectedCategoryId)) && { backgroundColor: c.primary },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[
                    styles.categoryPickerName, { color: c.foreground },
                    (item.id === selectedCategoryId || (item.id === null && !selectedCategoryId)) && { color: c.isDark ? "#1C1C1E" : "#FFFFFF", fontWeight: "500" },
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.categoryPickerCount, { color: c.muted }]}>{item.count} 词</Text>
                </Pressable>
              )}
            />
            <Pressable
              onPress={() => setShowCategoryPicker(false)}
              style={({ pressed }) => [styles.modalCloseButton, { backgroundColor: c.accentLight }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.modalCloseText, { color: c.muted }]}>关闭</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 指定词输入弹窗 */}
      <Modal visible={showCustomWordInput} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: c.overlayBg }]} onPress={() => { setShowCustomWordInput(false); Keyboard.dismiss(); }}>
          <Pressable style={[styles.customWordModal, { backgroundColor: c.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>指定一个词</Text>
            <Text style={[styles.customWordHint, { color: c.muted }]}>输入你想要的词,系统将随机匹配另外两个词</Text>
            <TextInput
              style={[styles.customWordInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.foreground }]}
              placeholder="输入词语..."
              placeholderTextColor={c.muted}
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
                style={({ pressed }) => [styles.customWordCancel, { backgroundColor: c.accentLight }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.customWordCancelText, { color: c.muted }]}>取消</Text>
              </Pressable>
              <Pressable
                onPress={customWord.trim() ? handleCustomWordStart : undefined}
                disabled={!customWord.trim()}
                style={({ pressed }) => [
                  styles.customWordConfirm,
                  { backgroundColor: c.primary },
                  !customWord.trim() && { backgroundColor: c.border },
                  pressed && customWord.trim() && { opacity: 0.7 },
                ]}
              >
                <Text style={[
                  styles.customWordConfirmText,
                  { color: c.isDark ? "#1C1C1E" : "#FFFFFF" },
                  !customWord.trim() && { color: c.muted },
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
  container: { flex: 1, alignSelf: "center", paddingTop: 34, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 40, lineHeight: 48, fontWeight: "600", letterSpacing: 2 },
  tagline: { marginTop: 4, fontSize: 14, letterSpacing: 1 },
  methodBadge: { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, marginTop: 4 },
  methodBadgeText: { fontSize: 13, fontWeight: "500", letterSpacing: 0.5 },
  contextRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 34, marginBottom: 18 },
  contextButton: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  contextLabel: { fontSize: 13, letterSpacing: 0.5 },
  contextHint: { fontSize: 13, letterSpacing: 0.5 },
  timer: { fontSize: 15, fontWeight: "500", letterSpacing: 1 },

  timeUpContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 120 },
  timeUpTitle: { fontSize: 22, fontWeight: "400", letterSpacing: 4, marginBottom: 12 },
  timeUpSubtitle: { fontSize: 15, fontWeight: "300", letterSpacing: 2 },

  idleContainer: { flex: 1, alignItems: "center" },
  idleDiagram: { width: "100%", height: 260, position: "relative", marginTop: 24 },
  idleCard: { position: "absolute", borderRadius: 24, borderWidth: 1 },
  idleTopCard: { width: TOP_CARD_WIDTH, height: 104, left: (CONTENT_WIDTH - TOP_CARD_WIDTH) / 2, top: 0 },
  idleBottomRow: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", justifyContent: "space-between" },
  idleBottomCard: { position: "relative", width: BOTTOM_CARD_WIDTH, height: 116 },
  idleNumber: { position: "absolute", top: 18, left: 18, fontSize: 12, fontWeight: "500", letterSpacing: 0.7 },
  idleHub: { position: "absolute", width: 30, height: 30, borderRadius: 15, left: CONTENT_WIDTH / 2 - 15, top: 112 },
  idleTitle: { fontSize: 22, lineHeight: 30, fontWeight: "600", letterSpacing: 0.5 },
  idleSubtitle: { marginTop: 8, fontSize: 14, letterSpacing: 0.5 },

  categoryFilter: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, marginBottom: 32, borderWidth: 1,
  },
  categoryFilterText: { fontSize: 14, letterSpacing: 1 },
  categoryFilterArrow: { fontSize: 12, marginLeft: 6 },

  startButton: {
    width: "100%", marginTop: 20, paddingVertical: 17, borderRadius: 32, borderWidth: 1, alignItems: "center",
  },
  startButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", letterSpacing: 1.5 },

  customWordLink: {
    flexDirection: "row", alignItems: "center", marginTop: 18, paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 20, borderWidth: 1,
  },
  customWordLinkText: { fontSize: 14, letterSpacing: 1, marginLeft: 6, fontWeight: "500" },

  constellation: { width: "100%", height: 376, position: "relative", marginBottom: 28 },
  topCardSlot: { position: "absolute", top: 0, left: (CONTENT_WIDTH - TOP_CARD_WIDTH) / 2 },
  bottomCardRow: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", justifyContent: "space-between" },
  connectorVertical: { position: "absolute", width: 1, height: 44, left: CONTENT_WIDTH / 2, top: 150 },
  connectorLeft: { position: "absolute", width: 82, height: 1, left: CONTENT_WIDTH / 2 - 76, top: 204, transform: [{ rotate: "-18deg" }] },
  connectorRight: { position: "absolute", width: 82, height: 1, left: CONTENT_WIDTH / 2 - 6, top: 204, transform: [{ rotate: "18deg" }] },
  hubOuter: { position: "absolute", width: 46, height: 46, borderRadius: 23, borderWidth: 1, left: CONTENT_WIDTH / 2 - 23, top: 174, alignItems: "center", justifyContent: "center" },
  hubInner: { width: 24, height: 24, borderRadius: 12 },
  inputSection: { marginBottom: 40 },
  promptTitle: { fontSize: 22, fontWeight: "600", lineHeight: 30, letterSpacing: 0.4 },
  promptSubtitle: { fontSize: 14, marginTop: 6, marginBottom: 16, lineHeight: 21 },
  input: {
    borderRadius: 22, padding: 20, fontSize: 16,
    lineHeight: 25, minHeight: 150, textAlignVertical: "top", borderWidth: 1,
  },
  actionButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, gap: 12 },
  secondaryButton: {
    flex: 1, paddingVertical: 13, borderRadius: 28,
    alignItems: "center", borderWidth: 1,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: "400", letterSpacing: 0.5 },
  saveButton: {
    width: "100%", marginTop: 16, paddingVertical: 16, borderRadius: 30,
    alignItems: "center", borderWidth: 1,
  },
  saveButtonText: { fontSize: 16, fontWeight: "600", letterSpacing: 1 },

  toastContainer: { alignItems: "center", marginTop: 40 },
  toastText: { fontSize: 16, letterSpacing: 2 },

  modalOverlay: {
    flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32,
  },
  modalContent: {
    borderRadius: 16, padding: 24, width: "100%", maxWidth: 360, maxHeight: "70%",
  },
  modalTitle: { fontSize: 18, fontWeight: "500", marginBottom: 16, textAlign: "center" },
  categoryPickerList: { maxHeight: 400 },
  categoryPickerItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, marginBottom: 6,
  },
  categoryPickerName: { fontSize: 15 },
  categoryPickerCount: { fontSize: 13 },
  modalCloseButton: {
    marginTop: 16, paddingVertical: 14, borderRadius: 24, alignItems: "center",
  },
  modalCloseText: { fontSize: 15 },

  customWordModal: {
    borderRadius: 16, padding: 24, width: "100%", maxWidth: 340,
  },
  customWordHint: { fontSize: 13, textAlign: "center", marginBottom: 20, lineHeight: 18 },
  customWordInput: {
    borderRadius: 12, padding: 16, fontSize: 18,
    textAlign: "center", borderWidth: 1, letterSpacing: 2,
  },
  customWordActions: { flexDirection: "row", marginTop: 20, gap: 12 },
  customWordCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 24, alignItems: "center",
  },
  customWordCancelText: { fontSize: 15 },
  customWordConfirm: {
    flex: 1, paddingVertical: 14, borderRadius: 24, alignItems: "center",
  },
  customWordConfirmText: { fontSize: 15, fontWeight: "500" },
});
