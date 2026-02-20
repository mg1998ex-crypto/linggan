/**
 * 卷轴滚动动画组件
 * 实现老虎机般的词语滚动效果
 */

import { useEffect } from "react";
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
      <Animated.View style={[styles.wordContainer, animatedStyle]}>
        <Text style={styles.word}>{word}</Text>
      </Animated.View>
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
    minWidth: 120,
  },
  wordContainer: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  word: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 2,
    flexWrap: "nowrap",
    textAlign: "center",
  },
});
