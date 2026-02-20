/**
 * 卷轴滚动动画组件
 * 实现老虎机般的词语滚动效果
 * 
 * 关键设计:
 * 1. 目标词放在滚动列表的最后位置,动画向上滚动到最后一个词
 * 2. 动画结束后切换为静态显示目标词(无缝过渡)
 * 3. 手动计算字体大小确保词语在一行内完整显示(不依赖 adjustsFontSizeToFit)
 */

import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const SCREEN_WIDTH = Dimensions.get("window").width;
// 三个词水平排列,减去容器两侧padding(20*2=40),词之间间距(8*2=16)
// 每个词容器宽度 = (屏幕宽度 - 40 - 16) / 3
const WORD_CONTAINER_WIDTH = Math.floor((SCREEN_WIDTH - 56) / 3);

// 每个词条目的高度(含间距)
const ITEM_HEIGHT = 60;
// 滚动列表中的随机词数量
const RANDOM_WORD_COUNT = 15;

/**
 * 根据词语长度和容器宽度计算合适的字体大小
 * 确保词语在一行内完整显示,不被截断
 */
function calcFontSize(text: string): number {
  if (!text) return 24;
  const len = text.length;
  // 每个中文字符大约占 fontSize * 1.1 的宽度(含letterSpacing)
  // 容器内可用宽度 = WORD_CONTAINER_WIDTH - 8(左右padding各4)
  const availableWidth = WORD_CONTAINER_WIDTH - 8;
  // 目标:len * fontSize * 1.1 <= availableWidth
  // fontSize <= availableWidth / (len * 1.1)
  const maxByWidth = Math.floor(availableWidth / (len * 1.15));
  
  // 根据字数设定理想字体大小
  let idealSize: number;
  if (len <= 2) {
    idealSize = 30;
  } else if (len === 3) {
    idealSize = 24;
  } else if (len === 4) {
    idealSize = 20;
  } else {
    idealSize = 17;
  }
  
  // 取理想大小和容器限制中的较小值,最小不低于14
  return Math.max(14, Math.min(idealSize, maxByWidth));
}

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

  return (
    <View style={styles.container}>
      {!showStatic && rollingWords.length > 0 ? (
        /* 滚动动画模式 */
        <Animated.View style={[styles.rollingContainer, animatedStyle]}>
          {rollingWords.map((w, index) => (
            <View key={index} style={styles.wordItem}>
              <Text
                style={[styles.word, { fontSize: calcFontSize(w) }]}
                numberOfLines={1}
                ellipsizeMode="clip"
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
              style={[styles.word, { fontSize: calcFontSize(word) }]}
              numberOfLines={1}
              ellipsizeMode="clip"
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
