/**
 * 草稿自动保存工具
 * 使用 AsyncStorage 实时保存用户输入的灵感草稿
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const DRAFT_KEY = "@linggan_draft";

export interface Draft {
  word1: string;
  word2: string;
  word3: string;
  content: string;
  timestamp: number;
}

/**
 * 保存草稿
 */
export async function saveDraft(draft: Draft): Promise<void> {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    console.error("保存草稿失败:", error);
  }
}

/**
 * 读取草稿
 */
export async function loadDraft(): Promise<Draft | null> {
  try {
    const data = await AsyncStorage.getItem(DRAFT_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error("读取草稿失败:", error);
    return null;
  }
}

/**
 * 清除草稿
 */
export async function clearDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    console.error("清除草稿失败:", error);
  }
}
