/**
 * 反馈本地存储服务
 * 使用 AsyncStorage 存储用户提交的反馈记录
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export type FeedbackType = "bug" | "feature" | "other";

export interface FeedbackRecord {
  id: string;
  type: FeedbackType;
  content: string;
  contact: string;
  createdAt: string; // ISO string
}

const STORAGE_KEY = "@linggan_feedback_records";

/** 获取所有反馈记录 */
export async function getFeedbackRecords(): Promise<FeedbackRecord[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/** 保存反馈记录 */
export async function saveFeedbackRecord(record: Omit<FeedbackRecord, "id" | "createdAt">): Promise<FeedbackRecord> {
  const records = await getFeedbackRecords();
  const newRecord: FeedbackRecord = {
    ...record,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
  };
  records.unshift(newRecord); // 最新的在前面
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return newRecord;
}

/** 格式化反馈内容 */
export function formatFeedbackText(record: FeedbackRecord): string {
  const typeMap: Record<FeedbackType, string> = {
    bug: "Bug报告",
    feature: "功能建议",
    other: "其他",
  };

  const d = new Date(record.createdAt);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  let text = `【灵感APP意见反馈】\n`;
  text += `类型：${typeMap[record.type]}\n`;
  text += `内容：${record.content}\n`;
  if (record.contact) {
    text += `联系方式：${record.contact}\n`;
  }
  text += `时间：${dateStr}\n`;
  text += `APP版本：1.0.0`;
  return text;
}
