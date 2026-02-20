/**
 * 卷轴滚动动画组件
 * 实现老虎机般的词语滚动效果
 */

import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";

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

  // 根据词语长度计算字体大小
  const getFontSize = (text: string) => {
    const length = text.length;
    if (length <= 2) return 36; // 2字词:大号字体
    if (length === 3) return 30; // 3字词:中号字体
    return 24; // 4字及以上:小号字体
  };

  // 生成滚动时显示的随机词语列表
  useEffect(() => {
    if (isRolling) {
      // 生成 20 个随机词语用于滚动显示
      const randomWords = [];
      for (let i = 0; i < 20; i++) {
        const randomIndex = Math.floor(Math.random() * words.length);
        randomWords.push(words[randomIndex]);
      }
      // 最后一个是目标词
      randomWords.push(word);
      setRollingWords(randomWords);
    }
  }, [isRolling, word, words]);

  useEffect(() => {
    if (isRolling) {
      // 开始滚动动画 - 增强老虎机效果
      opacity.value = withTiming(0.6, { duration: 200 });
      translateY.value = withSequence(
        // 快速向上滚动(模拟老虎机快速旋转)
        withTiming(-1500, {
          duration: delay,
          easing: Easing.linear,
        }),
        // 停止时先减速再回弹
        withTiming(-50, {
          duration: 300,
          easing: Easing.out(Easing.quad),
        }),
        // 最终回弹到位
        withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.back(1.5)),
        }, (finished) => {
          if (finished) {
            opacity.value = withTiming(1, { duration: 200 });
            if (onStop) {
              runOnJS(onStop)();
            }
          }
        })
      );
    } else {
      // 重置状态
      translateY.value = 0;
      opacity.value = 1;
    }
  }, [isRolling, delay]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  return (
    <View style={styles.container}>
      {isRolling && rollingWords.length > 0 ? (
        /* 滚动时显示多个词语 */
        <Animated.View style={[styles.rollingContainer, animatedStyle]}>
          {rollingWords.map((w, index) => (
            <View key={index} style={styles.wordContainer}>
              <Text style={[styles.word, { fontSize: getFontSize(w) }]}>{w}</Text>
            </View>
          ))}
        </Animated.View>
      ) : (
        /* 停止时显示最终词语 */
        <View style={styles.wordContainer}>
          <Text style={[styles.word, { fontSize: getFontSize(word) }]}>{word}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 120,
    overflow: "hidden",
    paddingHorizontal: 8,
  },
  rollingContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  wordContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 60,
    marginVertical: 10,
  },
  word: {
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
    width: "100%",
  },
});
