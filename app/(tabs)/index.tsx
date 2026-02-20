/**
 * 灵感生成主屏幕
 * 实现卷轴滚动动画、灵感记录和自动保存功能
 */

import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { WordRoller } from "@/components/word-roller";
import { getRandomWords } from "@/lib/word-filter";
import { saveDraft, loadDraft, clearDraft } from "@/lib/draft-storage";
import { trpc } from "@/lib/trpc";
import wordsData from "@/assets/data/words.json";
import { OnboardingGuide, checkOnboardingCompleted } from "@/components/onboarding-guide";

type RollingState = "idle" | "rolling" | "stopped";

export default function HomeScreen() {
  const [words, setWords] = useState<[string, string, string]>(["", "", ""]);
  const [rollingState, setRollingState] = useState<RollingState>("idle");
  const [stoppedCount, setStoppedCount] = useState(0);
  const [content, setContent] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5分钟 = 300秒
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 检查是否首次启动
  useEffect(() => {
    checkOnboardingCompleted().then((completed) => {
      if (!completed) {
        setShowOnboarding(true);
      }
    });
  }, []);

  // 加载草稿
  useEffect(() => {
    loadDraft().then((draft) => {
      if (draft) {
        setWords([draft.word1, draft.word2, draft.word3]);
        setContent(draft.content);
        setShowInput(true);
        setRollingState("stopped");
        setStoppedCount(3);
      }
    });
  }, []);

  // 自动保存草稿
  useEffect(() => {
    if (words[0] && words[1] && words[2] && content) {
      const draft = {
        word1: words[0],
        word2: words[1],
        word3: words[2],
        content,
        timestamp: Date.now(),
      };
      saveDraft(draft);
    }
  }, [content, words]);

  const handleStart = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // 停止计时器
    stopTimer();

    // 生成三个随机词
    const newWords = getRandomWords(wordsData.words);
    setWords(newWords);
    setRollingState("rolling");
    setStoppedCount(0);
    setShowInput(false);
    setContent("");

    // 清除之前的备用计时器
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }

    // 备用机制:如果 3.5 秒后输入框还没显示,强制显示
    fallbackTimerRef.current = setTimeout(() => {
      console.log('[Fallback] Forcing input to show after timeout');
      setRollingState("stopped");
      setStoppedCount(3);
      setShowInput(true);
      startTimer();
    }, 3500); // 最长延迟 2400ms + 400ms 动画 + 700ms 缓冲
  };

  const handleRollerStop = () => {
    setStoppedCount((prevCount) => {
      const newCount = prevCount + 1;
      console.log(`[handleRollerStop] Roller stopped, count: ${newCount}/3`);

      if (newCount === 3) {
        console.log('[handleRollerStop] All rollers stopped, showing input and starting timer');
        
        // 清除备用计时器
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        
        setRollingState("stopped");
        // 延迟显示输入框并启动计时器
        setTimeout(() => {
          setShowInput(true);
          startTimer();
          console.log('[handleRollerStop] Input shown and timer started');
        }, 300);
      }

      return newCount;
    });
  };

  // 启动计时器
  const startTimer = () => {
    setTimeLeft(300);
    setTimerActive(true);
  };

  // 停止计时器
  const stopTimer = () => {
    setTimerActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

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

  const createInspiration = trpc.inspirations.create.useMutation();

  const handleSave = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      // 保存到数据库
      await createInspiration.mutateAsync({
        word1: words[0],
        word2: words[1],
        word3: words[2],
        content: content.trim(),
      });

      // 清除草稿
      await clearDraft();

      // 停止计时器
      stopTimer();

      // 重置状态
      setWords(["", "", ""]);
      setContent("");
      setShowInput(false);
      setRollingState("idle");
      setStoppedCount(0);

      // 显示成功提示
      if (Platform.OS === "web") {
        alert("灵感已保存");
      }
    } catch (error) {
      console.error("保存灵感失败:", error);
      if (Platform.OS === "web") {
        alert("保存失败,请重试");
      } else {
        Alert.alert("错误", "保存失败,请重试");
      }
    }
  };

  const isRolling = rollingState === "rolling";
  const canSave = content.trim().length > 0;

  return (
    <ScreenContainer className="bg-background">
      {/* 首次启动引导 */}
      <OnboardingGuide
        visible={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />

      <View style={styles.container}>
        {/* 标题区域 */}
        <View style={styles.header}>
          <Text style={styles.title}>灵感</Text>
          
          {/* 5分钟计时器 - 低调显示 */}
          {timerActive && (
            <Text style={[
              styles.timer,
              timeLeft <= 60 && styles.timerWarning,
              timeLeft === 0 && styles.timerExpired,
            ]}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </Text>
          )}
        </View>

        {/* 卷轴区域 */}
        {rollingState !== "idle" && (
          <View style={styles.rollersContainer}>
            <WordRoller
              word={words[0]}
              isRolling={isRolling}
              delay={1800}
              onStop={handleRollerStop}
              words={wordsData.words}
            />
            <WordRoller
              word={words[1]}
              isRolling={isRolling}
              delay={2100}
              onStop={handleRollerStop}
              words={wordsData.words}
            />
            <WordRoller
              word={words[2]}
              isRolling={isRolling}
              delay={2400}
              onStop={handleRollerStop}
              words={wordsData.words}
            />
          </View>
        )}

        {/* 开始/重新开始按钮 - 始终显示在卷轴下方 */}
        {(rollingState === "idle" || rollingState === "stopped") && !showInput && (
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [
                styles.startButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>
                {rollingState === "idle" ? "开始" : "重新开始"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* 输入框 */}
        {showInput && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="记录你的灵感点子..."
              placeholderTextColor="#8A8A8A"
              multiline
              value={content}
              onChangeText={setContent}
              autoFocus
              returnKeyType="done"
            />

            {/* 按钮组 - 重新开始和保存 */}
            <View style={styles.actionButtonsContainer}>
              <Pressable
                onPress={handleStart}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>重新开始</Text>
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
                  styles.buttonText,
                  !canSave && styles.buttonTextDisabled,
                ]}>
                  保存灵感
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  header: {
    alignItems: "center",
    marginBottom: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: "300",
    color: "#2C2C2C",
    letterSpacing: 8,
  },
  rollersContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 20,
  },
  startButton: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    backgroundColor: "#5A6C7D",
    borderRadius: 30,
  },
  saveButton: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    backgroundColor: "#5A6C7D",
    borderRadius: 30,
    alignSelf: "center",
    marginTop: 24,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  inputContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  input: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 20,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 180,
    textAlignVertical: "top",
    color: "#2C2C2C",
  },
  saveButtonDisabled: {
    backgroundColor: "#D0D0D0",
    opacity: 0.5,
  },
  buttonTextDisabled: {
    color: "#8A8A8A",
  },
  timer: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "400",
    color: "#5A5A5A",
    letterSpacing: 2,
  },
  timerWarning: {
    color: "#D4A574",
  },
  timerExpired: {
    color: "#C9A87C",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 16,
  },
  secondaryButton: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#E8E8E8",
    borderRadius: 30,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#5A5A5A",
    letterSpacing: 1,
  },
});
