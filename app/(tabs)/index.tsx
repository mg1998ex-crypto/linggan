/**
 * 灵感生成主屏幕
 * 实现卷轴滚动动画、灵感记录和自动保存功能
 */

import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { WordRoller } from "@/components/word-roller";
import { getRandomWords } from "@/lib/word-filter";
import { saveDraft, loadDraft, clearDraft } from "@/lib/draft-storage";
import { trpc } from "@/lib/trpc";
import wordsData from "@/assets/data/words.json";

type RollingState = "idle" | "rolling" | "stopped";

export default function HomeScreen() {
  const [words, setWords] = useState<[string, string, string]>(["", "", ""]);
  const [rollingState, setRollingState] = useState<RollingState>("idle");
  const [stoppedCount, setStoppedCount] = useState(0);
  const [content, setContent] = useState("");
  const [showInput, setShowInput] = useState(false);

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

    // 生成三个随机词
    const newWords = getRandomWords(wordsData.words);
    setWords(newWords);
    setRollingState("rolling");
    setStoppedCount(0);
    setShowInput(false);
    setContent("");
  };

  const handleRollerStop = () => {
    const newCount = stoppedCount + 1;
    setStoppedCount(newCount);

    if (newCount === 3) {
      setRollingState("stopped");
      // 延迟显示输入框
      setTimeout(() => {
        setShowInput(true);
      }, 300);
    }
  };

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
      <View style={styles.container}>
        {/* 标题区域 */}
        <View style={styles.header}>
          <Text style={styles.title}>灵感</Text>
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

        {/* 开始按钮 */}
        {rollingState === "idle" && (
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [
                styles.startButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>开始</Text>
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

            {/* 保存按钮 */}
            {canSave && (
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.buttonText}>保存</Text>
              </Pressable>
            )}
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
    marginBottom: 60,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    alignItems: "center",
    marginTop: 120,
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
    marginTop: 40,
    paddingHorizontal: 20,
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
});
