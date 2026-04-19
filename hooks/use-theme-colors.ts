/**
 * 返回当前主题的颜色值
 * 根据 ThemeManager 的 resolvedScheme 返回对应的颜色
 */

import { useMemo } from "react";
import { useThemeManager, type ResolvedScheme } from "@/lib/theme-context";

/** 完整的主题颜色定义 */
export interface ThemeColorSet {
  // 基础色
  primary: string;
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  // 扩展色
  cardBg: string;
  inputBg: string;
  inputBorder: string;
  inputBorderFocus: string;
  accentLight: string;    // 主色调浅色版本
  accentDark: string;     // 主色调深色版本
  overlayBg: string;      // 弹窗遮罩
  navbarBg: string;       // 导航栏背景
  quoteLine: string;      // 引用竖线
  badgeBg: string;        // 标签背景
  badgeText: string;      // 标签文字
  isDark: boolean;
}

const lightColors: ThemeColorSet = {
  primary: "#F5A623",
  background: "#FAFAF5",
  surface: "#FFFFFF",
  foreground: "#2D2D2D",
  muted: "#8E8E93",
  border: "#F0EDE8",
  success: "#4CAF50",
  warning: "#F5A623",
  error: "#E74C3C",
  cardBg: "#FFFFFF",
  inputBg: "#FFFCF7",
  inputBorder: "#F0EDE8",
  inputBorderFocus: "#F5A623",
  accentLight: "#FFF8EE",
  accentDark: "#C48A1A",
  overlayBg: "rgba(0,0,0,0.5)",
  navbarBg: "#FAFAF5",
  quoteLine: "#F5A623",
  badgeBg: "#F5D9A8",
  badgeText: "#C48A1A",
  isDark: false,
};

const darkColors: ThemeColorSet = {
  primary: "#F5A623",
  background: "#1C1C1E",
  surface: "#2C2C2E",
  foreground: "#E5E5E7",
  muted: "#8E8E93",
  border: "#3A3A3C",
  success: "#66BB6A",
  warning: "#F5A623",
  error: "#EF5350",
  cardBg: "#2C2C2E",
  inputBg: "#3A3A3C",
  inputBorder: "#3A3A3C",
  inputBorderFocus: "#F5A623",
  accentLight: "#3A3520",
  accentDark: "#F5D9A8",
  overlayBg: "rgba(0,0,0,0.7)",
  navbarBg: "#1C1C1E",
  quoteLine: "#F5A623",
  badgeBg: "#3A3520",
  badgeText: "#F5D9A8",
  isDark: true,
};

export function getThemeColors(scheme: ResolvedScheme): ThemeColorSet {
  return scheme === "dark" ? darkColors : lightColors;
}

export function useThemeColors(): ThemeColorSet {
  const { resolvedScheme } = useThemeManager();
  return useMemo(() => getThemeColors(resolvedScheme), [resolvedScheme]);
}
