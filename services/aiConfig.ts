/**
 * AI 配置管理
 * 使用 expo-secure-store 加密存储 API Key
 * 支持 OpenAI 和 通义千问 两个平台
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 在 Web 端使用 AsyncStorage 作为 fallback
let SecureStore: any = null;
if (Platform.OS !== "web") {
  try {
    SecureStore = require("expo-secure-store");
  } catch (e) { /* not available */ }
}

export type AIPlatform = "openai" | "qwen";

export interface AIConfig {
  platform: AIPlatform;
  apiKey: string;
}

const PLATFORM_KEY = "@linggan_ai_platform";
const API_KEY_SECURE = "linggan_ai_api_key";
const API_KEY_ASYNC = "@linggan_ai_api_key_enc";

export const AI_PLATFORMS: Record<AIPlatform, { name: string; model: string; endpoint: string }> = {
  openai: {
    name: "OpenAI (GPT)",
    model: "gpt-4o-mini",
    endpoint: "https://api.openai.com/v1/chat/completions",
  },
  qwen: {
    name: "通义千问 (阿里云)",
    model: "qwen-turbo",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  },
};

/** 保存 API Key (加密存储) */
async function saveApiKey(key: string): Promise<void> {
  if (SecureStore) {
    await SecureStore.setItemAsync(API_KEY_SECURE, key);
  } else {
    // Web fallback: base64 编码存储
    const encoded = btoa(encodeURIComponent(key));
    await AsyncStorage.setItem(API_KEY_ASYNC, encoded);
  }
}

/** 读取 API Key */
async function getApiKey(): Promise<string | null> {
  try {
    if (SecureStore) {
      return await SecureStore.getItemAsync(API_KEY_SECURE);
    } else {
      const encoded = await AsyncStorage.getItem(API_KEY_ASYNC);
      if (encoded) {
        return decodeURIComponent(atob(encoded));
      }
      return null;
    }
  } catch {
    return null;
  }
}

/** 删除 API Key */
async function deleteApiKey(): Promise<void> {
  if (SecureStore) {
    await SecureStore.deleteItemAsync(API_KEY_SECURE);
  } else {
    await AsyncStorage.removeItem(API_KEY_ASYNC);
  }
}

/** 保存 AI 配置 */
export async function saveAIConfig(config: AIConfig): Promise<void> {
  await AsyncStorage.setItem(PLATFORM_KEY, config.platform);
  await saveApiKey(config.apiKey);
}

/** 读取 AI 配置 */
export async function getAIConfig(): Promise<AIConfig | null> {
  try {
    const platform = await AsyncStorage.getItem(PLATFORM_KEY);
    const apiKey = await getApiKey();
    if (!platform || !apiKey) return null;
    return { platform: platform as AIPlatform, apiKey };
  } catch {
    return null;
  }
}

/** 清除 AI 配置 */
export async function clearAIConfig(): Promise<void> {
  await AsyncStorage.removeItem(PLATFORM_KEY);
  await deleteApiKey();
}

/** 测试 API Key 是否有效 */
export async function testConnection(config: AIConfig): Promise<{ success: boolean; message: string }> {
  const platformInfo = AI_PLATFORMS[config.platform];
  try {
    const response = await fetch(platformInfo.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: platformInfo.model,
        messages: [{ role: "user", content: "你好" }],
        max_tokens: 10,
      }),
    });

    if (response.ok) {
      return { success: true, message: "连接成功！API Key 有效。" };
    }

    const data = await response.json().catch(() => null);
    if (response.status === 401) {
      return { success: false, message: "API Key 无效，请检查后重试。" };
    }
    if (response.status === 429) {
      return { success: false, message: "API 调用频率超限或额度不足。" };
    }
    if (response.status === 403) {
      return { success: false, message: "API Key 权限不足，请检查配置。" };
    }
    return { success: false, message: `连接失败 (${response.status})：${data?.error?.message || "未知错误"}` };
  } catch (e: any) {
    if (e.message?.includes("network") || e.message?.includes("fetch")) {
      return { success: false, message: "网络连接失败，请检查网络后重试。" };
    }
    return { success: false, message: `连接失败：${e.message || "未知错误"}` };
  }
}
