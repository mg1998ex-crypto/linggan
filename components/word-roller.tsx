/**
 * 卷轴滚动动画组件
 * 实现老虎机般的词语滚动效果
 * 
 * 关键设计:
 * 1. 目标词放在滚动列表的最后位置,动画向上滚动到最后一个词
 * 2. 动画结束后切换为静态显示目标词(无缝过渡)
 * 3. 手动计算字体大小确保词语在一行内完整显示
 * 4. 支持锁定状态:锁定时显示实心锁图标,静止不动
 */

import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions, Pressable, Platform } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
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
const WORD_CONTAINER_WIDTH = Math.floor((SCREEN_WIDTH - 56) / 3);

// 每个词条目的高度(含间距)
const ITEM_HEIGHT = 60;
// 滚动列表中的随机词数量
const RANDOM_WORD_COUNT = 15;

/**
 * 根据词语长度和容器宽度计算合适的字体大小
 */
function calcFontSize(text: string, containerWidth = WORD_CONTAINER_WIDTH, card = false): number {
  if (!text) return 24;
  const len = text.length;
  const availableWidth = containerWidth - (card ? 36 : 8);
  const maxByWidth = Math.floor(availableWidth / (len * 1.15));
  
  let idealSize: number;
  if (len <= 2) {
    idealSize = card ? 38 : 30;
  } else if (len === 3) {
    idealSize = card ? 34 : 24;
  } else if (len === 4) {
    idealSize = card ? 30 : 20;
  } else {
    idealSize = card ? 24 : 17;
  }
  
  return Math.max(14, Math.min(idealSize, maxByWidth));
}

interface WordRollerProps {
  word: string;
  isRolling: boolean;
  delay: number;
  onStop?: () => void;
  words: string[];
  /** 是否处于锁定状态 */
  isLocked?: boolean;
  /** 锁定状态切换回调 */
  onToggleLock?: () => void;
  /** 是否显示锁图标(仅在stopped状态显示) */
  showLock?: boolean;
  /** 大卡片模式，用于三词三角阵 */
  card?: boolean;
  label?: string;
  cardWidth?: number;
  cardHeight?: number;
  /** 主题颜色 */
  colors?: { foreground: string; primary: string; muted: string; accentDark: string; cardBg?: string; border?: string };
}

export function WordRoller({ word, isRolling, delay, onStop, words, isLocked, onToggleLock, showLock, card = false, label, cardWidth, cardHeight, colors }: WordRollerProps) {
  const textColor = colors?.foreground ?? "#2D2D2D";
  const lockedColor = colors?.accentDark ?? "#C48A1A";
  const primaryColor = colors?.primary ?? "#F5A623";
  const mutedColor = colors?.muted ?? "#C0C0C5";
  const width = cardWidth ?? WORD_CONTAINER_WIDTH;
  const height = cardHeight ?? ITEM_HEIGHT;
  const itemHeight = card ? height - 50 : ITEM_HEIGHT;
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const [rollingWords, setRollingWords] = useState<string[]>([]);
  const [showStatic, setShowStatic] = useState(true);

  const handleAnimationEnd = useCallback(() => {
    setShowStatic(true);
    if (onStop) {
      onStop();
    }
  }, [onStop]);

  // 生成滚动词语列表
  useEffect(() => {
    if (isRolling && word && !isLocked) {
      const randomWords: string[] = [];
      for (let i = 0; i < RANDOM_WORD_COUNT; i++) {
        const randomIndex = Math.floor(Math.random() * words.length);
        randomWords.push(words[randomIndex]);
      }
      randomWords.push(word);
      setRollingWords(randomWords);
      setShowStatic(false);
    }
  }, [isRolling, word, words, isLocked]);

  // 动画控制
  useEffect(() => {
    if (isRolling && rollingWords.length > 0 && !isLocked) {
      const totalScrollDistance = (rollingWords.length - 1) * itemHeight;

      translateY.value = 0;
      opacity.value = withTiming(0.7, { duration: 150 });

      translateY.value = withSequence(
        withTiming(-totalScrollDistance + itemHeight, {
          duration: delay - 400,
          easing: Easing.in(Easing.quad),
        }),
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
      translateY.value = 0;
      opacity.value = 1;
    }
  }, [isRolling, rollingWords, isLocked, itemHeight]);

  // 锁定时直接调用onStop(不需要动画)
  useEffect(() => {
    if (isRolling && isLocked && onStop) {
      // 锁定的词不需要动画,直接通知停止
      const timer = setTimeout(() => {
        onStop();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isRolling, isLocked, onStop]);

  const handleLockPress = () => {
    if (onToggleLock) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onToggleLock();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.outerContainer, card && { width }]}>
      <View style={[
        styles.container,
        { width, height },
        card && [styles.card, { backgroundColor: colors?.cardBg ?? "#FFFFFF", borderColor: colors?.border ?? "#E4E1DA" }],
        isLocked && showLock && styles.containerLocked,
      ]}>
        {card && label ? (
          <Text style={[styles.cardLabel, { color: lockedColor }]}>{label}</Text>
        ) : null}
        {!showStatic && rollingWords.length > 0 && !isLocked ? (
          <Animated.View style={[styles.rollingContainer, animatedStyle]}>
            {rollingWords.map((w, index) => (
              <View key={index} style={[styles.wordItem, { height: itemHeight }]}>
                <Text
                  style={[styles.word, { fontSize: calcFontSize(w, width, card), color: textColor }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {w}
                </Text>
              </View>
            ))}
          </Animated.View>
        ) : (
          <View style={[styles.wordItem, { height: itemHeight }]}>
            {word ? (
              <Text
                style={[
                  styles.word,
                  { fontSize: calcFontSize(word, width, card), color: textColor },
                  isLocked && showLock && { color: lockedColor },
                ]}
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                {word}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      {/* 锁图标 */}
      {showLock && word ? (
        <Pressable
          onPress={handleLockPress}
          style={({ pressed }) => [
            styles.lockButton,
            card && styles.cardLockButton,
            pressed && { opacity: 0.5 },
          ]}
          hitSlop={12}
        >
          <MaterialIcons
            name={isLocked ? "lock" : "lock-open"}
            size={16}
            color={isLocked ? primaryColor : mutedColor}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: "center",
  },
  container: {
    width: WORD_CONTAINER_WIDTH,
    height: ITEM_HEIGHT,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    paddingTop: 34,
  },
  cardLabel: {
    position: "absolute",
    left: 18,
    top: 15,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.8,
  },
  containerLocked: {
    // 锁定时的轻微视觉变化
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
    color: "#2D2D2D", // overridden by inline style
  },
  wordLocked: {
    color: "#C48A1A", // overridden by inline style
  },
  lockButton: {
    marginTop: 4,
    padding: 4,
  },
  cardLockButton: {
    position: "absolute",
    right: 12,
    top: 10,
    marginTop: 0,
    padding: 8,
  },
});
