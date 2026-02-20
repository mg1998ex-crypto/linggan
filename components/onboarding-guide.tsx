/**
 * 首次启动操作指南组件
 * 展示简洁的 2-3 步操作引导
 */

import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "@linggan_onboarding_completed";

interface OnboardingGuideProps {
  visible: boolean;
  onComplete: () => void;
}

export function OnboardingGuide({ visible, onComplete }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "欢迎使用灵感",
      description: "一个帮助你激发创意的极简工具",
    },
    {
      title: "① 抽取随机词",
      description: "点击\u201c开始\u201d按钮\n系统将随机抽取三个词语",
    },
    {
      title: "② 自由联想",
      description: "在 5 分钟内\n记录这三个词激发的灵感",
    },
    {
      title: "③ 保存创意",
      description: "点击\u201c保存灵感\u201d按钮\n你的点子将被永久保存",
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    onComplete();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleComplete}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 进度指示器 */}
          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === currentStep && styles.progressDotActive,
                ]}
              />
            ))}
          </View>

          {/* 内容区域 */}
          <View style={styles.content}>
            <Text style={styles.title}>{steps[currentStep].title}</Text>
            <Text style={styles.description}>{steps[currentStep].description}</Text>
          </View>

          {/* 按钮区域 */}
          <View style={styles.buttonContainer}>
            {currentStep < steps.length - 1 && (
              <Pressable
                onPress={handleSkip}
                style={({ pressed }) => [
                  styles.skipButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.skipButtonText}>跳过</Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                styles.nextButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.nextButtonText}>
                {currentStep < steps.length - 1 ? "下一步" : "开始使用"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export async function checkOnboardingCompleted(): Promise<boolean> {
  const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
  return completed === "true";
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 40,
    width: "100%",
    maxWidth: 400,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 40,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D0D0D0",
  },
  progressDotActive: {
    backgroundColor: "#5A6C7D",
    width: 24,
  },
  content: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "500",
    color: "#2C2C2C",
    marginBottom: 20,
    textAlign: "center",
    letterSpacing: 2,
  },
  description: {
    fontSize: 16,
    lineHeight: 28,
    color: "#5A5A5A",
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#D0D0D0",
  },
  skipButtonText: {
    fontSize: 16,
    color: "#8A8A8A",
    fontWeight: "500",
  },
  nextButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: "#5A6C7D",
    borderRadius: 24,
  },
  nextButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
});
