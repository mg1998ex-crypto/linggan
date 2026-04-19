/**
 * 主题管理 Context
 * 支持三种模式：跟随系统 / 浅色 / 深色
 * 用户选择保存在 AsyncStorage 中
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppearanceMode = "system" | "light" | "dark";
export type ResolvedScheme = "light" | "dark";

const STORAGE_KEY = "@linggan_appearance_mode";

type ThemeManagerContextValue = {
  /** 用户选择的外观模式 */
  appearanceMode: AppearanceMode;
  /** 实际解析后的配色方案 */
  resolvedScheme: ResolvedScheme;
  /** 设置外观模式 */
  setAppearanceMode: (mode: AppearanceMode) => void;
  /** 是否为深色模式 */
  isDark: boolean;
};

const ThemeManagerContext = createContext<ThemeManagerContextValue | null>(null);

export function ThemeManagerProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>("system");
  const [loaded, setLoaded] = useState(false);

  // 从本地存储加载用户偏好
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === "light" || value === "dark" || value === "system") {
        setAppearanceModeState(value);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const setAppearanceMode = useCallback((mode: AppearanceMode) => {
    setAppearanceModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  }, []);

  const resolvedScheme: ResolvedScheme = useMemo(() => {
    if (appearanceMode === "system") return systemScheme as ResolvedScheme;
    return appearanceMode;
  }, [appearanceMode, systemScheme]);

  const isDark = resolvedScheme === "dark";

  const value = useMemo(() => ({
    appearanceMode,
    resolvedScheme,
    setAppearanceMode,
    isDark,
  }), [appearanceMode, resolvedScheme, setAppearanceMode, isDark]);

  return (
    <ThemeManagerContext.Provider value={value}>
      {children}
    </ThemeManagerContext.Provider>
  );
}

export function useThemeManager(): ThemeManagerContextValue {
  const ctx = useContext(ThemeManagerContext);
  if (!ctx) {
    throw new Error("useThemeManager must be used within ThemeManagerProvider");
  }
  return ctx;
}
