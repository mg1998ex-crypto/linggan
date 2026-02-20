/**
 * 卷轴滚动动画组件
 * 实现老虎机般的词语滚动效果
 * 
 * 关键设计:
 * 1. 目标词放在滚动列表的最后位置,动画向上滚动到最后一个词
 * 2. 动画结束后切换为静态显示目标词(无缝过渡)
 * 3. 使用 numberOfLines={1} + adjustsFontSizeToFit 确保词语不换行
 */

import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const SCREEN_WIDTH = Dimensions.get("window").width;
// 每个词占屏幕宽度的约1/3,减去两侧padding
const WORD_CONTAINER_WIDTH = (SCREEN_WIDTH - 64) / 3;

// 每个词条目的高度(含间距)
const ITEM_HEIGHT = 60;
// 滚动列表中的随机词数量
const RANDOM_WORD_COUNT = 15;

interface WordRollerProps {
  word: string;
  isRolling: boolean;
  delay: number; // 停止延迟(毫秒)
  onStop?: () => void;
  words: string[]; // 用于滚动时显示的词库
}

export function WordRoller({ word, isRolling, delay, onStop, words }: WordRollerProps) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const [rollingWords, setRollingWords] = useState<string[]>([]);
  const [showStatic, setShowStatic] = useState(true); // 是否显示静态词(非动画)

  // 动画结束回调
  const handleAnimationEnd = useCallback(() => {
    // 切换到静态显示目标词
    setShowStatic(true);
    if (onStop) {
      onStop();
    }
  }, [onStop]);

  // 生成滚动词语列表:随机词 + 目标词(在最后)
  useEffect(() => {
    if (isRolling && word) {
      const randomWords: string[] = [];
      for (let i = 0; i < RANDOM_WORD_COUNT; i++) {
        const randomIndex = Math.floor(Math.random() * words.length);
        randomWords.push(words[randomIndex]);
      }
      // 目标词放在最后,动画向上滚动后最终停在这个词上
      randomWords.push(word);
      setRollingWords(randomWords);
      setShowStatic(false); // 切换到动画模式
    }
  }, [isRolling, word, words]);

  // 动画控制
  useEffect(() => {
    if (isRolling && rollingWords.length > 0) {
      // 计算需要滚动的总距离:滚动到最后一个词(目标词)
      // 总高度 = (词条数量 - 1) * ITEM_HEIGHT (因为第一个词已经在视口中)
      const totalScrollDistance = (rollingWords.length - 1) * ITEM_HEIGHT;

      // 重置位置
      translateY.value = 0;
      opacity.value = withTiming(0.7, { duration: 150 });

      // 动画序列:快速滚动 → 减速停在目标词
      translateY.value = withSequence(
        // 快速滚动大部分距离
        withTiming(-totalScrollDistance + ITEM_HEIGHT, {
          duration: delay - 400,
          easing: Easing.in(Easing.quad),
        }),
        // 最后一段减速,精确停在目标词上
        withTiming(-totalScrollDistance, {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        }, (finished) => {
          if (finished) {
            opacity.value = withTiming(1, { duration: 150 });
            runOnJS(handleAnimationEnd)();
          }
        })
      );
    } else if (!isRolling) {
      // 重置
      translateY.value = 0;
      opacity.value = 1;
    }
  }, [isRolling, rollingWords]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // 根据词语长度计算字体大小(作为初始值,adjustsFontSizeToFit会自动缩小)
  const getFontSize = (text: string) => {
    if (!text) return 28;
    const length = text.length;
    if (length <= 2) return 34;
    if (length === 3) return 28;
    return 22;
  };

  return (
    <View style={styles.container}>
      {!showStatic && rollingWords.length > 0 ? (
        /* 滚动动画模式 */
        <Animated.View style={[styles.rollingContainer, animatedStyle]}>
          {rollingWords.map((w, index) => (
            <View key={index} style={styles.wordItem}>
              <Text
                style={[styles.word, { fontSize: getFontSize(w) }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {w}
              </Text>
            </View>
          ))}
        </Animated.View>
      ) : (
        /* 静态显示模式(初始 + 动画结束后) */
        <View style={styles.wordItem}>
          {word ? (
            <Text
              style={[styles.word, { fontSize: getFontSize(word) }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {word}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: WORD_CONTAINER_WIDTH,
    height: ITEM_HEIGHT,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  rollingContainer: {
    width: "100%",
    alignItems: "center",
  },
  wordItem: {
    width: "100%",
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  word: {
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
    color: "#2C2C2C",
  },
});
