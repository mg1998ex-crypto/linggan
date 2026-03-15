/**
 * 词库数据存储模块
 * 使用 AsyncStorage 管理分类词库数据
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import categorizedWords from "@/assets/data/categorized_words.json";

// ============ 类型定义 ============

export interface WordItem {
  text: string;
  isSystem: boolean;
}

export interface Category {
  id: string;
  name: string;
  isSystem: boolean;
  isHidden: boolean;
  words: WordItem[];
}

export interface WordLibraryData {
  categories: Category[];
  version: number;
  selectedCategoryId: string | null;
}

// ============ 常量 ============

const STORAGE_KEY = "@linggan_word_library";
const DATA_VERSION = 1;

export const SYSTEM_CATEGORIES = [
  "日用品", "食物饮品", "动物", "植物", "科技电子",
  "交通工具", "服饰配件", "建筑场所", "自然现象",
  "文体用品", "乐器", "工具器械", "家具家电", "其他",
] as const;

function systemCategoryId(name: string): string {
  return `sys_${name}`;
}

function userCategoryId(): string {
  return `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ============ 初始化 ============

function createInitialData(): WordLibraryData {
  const typed = categorizedWords as Record<string, string[]>;
  const categories: Category[] = SYSTEM_CATEGORIES.map((name) => ({
    id: systemCategoryId(name),
    name,
    isSystem: true,
    isHidden: false,
    words: (typed[name] || []).map((text: string) => ({ text, isSystem: true })),
  }));
  return { categories, version: DATA_VERSION, selectedCategoryId: null };
}

// ============ 存储操作 ============

export async function loadWordLibrary(): Promise<WordLibraryData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: WordLibraryData = JSON.parse(raw);
      if (data.version === DATA_VERSION) return data;
    }
    const initial = createInitialData();
    await saveWordLibrary(initial);
    return initial;
  } catch (error) {
    console.error("加载词库失败:", error);
    return createInitialData();
  }
}

export async function saveWordLibrary(data: WordLibraryData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("保存词库失败:", error);
  }
}

// ============ 分类操作 ============

export function createCategory(data: WordLibraryData, name: string): WordLibraryData {
  return {
    ...data,
    categories: [...data.categories, {
      id: userCategoryId(), name, isSystem: false, isHidden: false, words: [],
    }],
  };
}

export function renameCategory(data: WordLibraryData, categoryId: string, newName: string): WordLibraryData {
  return {
    ...data,
    categories: data.categories.map((c) =>
      c.id === categoryId && !c.isSystem ? { ...c, name: newName } : c
    ),
  };
}

export function deleteCategory(data: WordLibraryData, categoryId: string): WordLibraryData {
  const cat = data.categories.find((c) => c.id === categoryId);
  if (!cat || cat.isSystem) return data;
  const otherId = systemCategoryId("其他");
  return {
    ...data,
    categories: data.categories
      .filter((c) => c.id !== categoryId)
      .map((c) => c.id === otherId ? { ...c, words: [...c.words, ...cat.words] } : c),
    selectedCategoryId: data.selectedCategoryId === categoryId ? null : data.selectedCategoryId,
  };
}

export function toggleCategoryHidden(data: WordLibraryData, categoryId: string): WordLibraryData {
  return {
    ...data,
    categories: data.categories.map((c) =>
      c.id === categoryId ? { ...c, isHidden: !c.isHidden } : c
    ),
  };
}

// ============ 词语操作 ============

export function addWord(data: WordLibraryData, categoryId: string, text: string): [WordLibraryData, boolean] {
  const trimmed = text.trim();
  if (!trimmed) return [data, false];
  const cat = data.categories.find((c) => c.id === categoryId);
  if (!cat || cat.words.some((w) => w.text === trimmed)) return [data, false];
  return [{
    ...data,
    categories: data.categories.map((c) =>
      c.id === categoryId ? { ...c, words: [...c.words, { text: trimmed, isSystem: false }] } : c
    ),
  }, true];
}

export function addWords(data: WordLibraryData, categoryId: string, texts: string[]): [WordLibraryData, number, number] {
  let updated = data;
  let added = 0;
  let skipped = 0;
  for (const text of texts) {
    const [d, ok] = addWord(updated, categoryId, text);
    updated = d;
    if (ok) added++; else if (text.trim()) skipped++;
  }
  return [updated, added, skipped];
}

export function removeWord(data: WordLibraryData, categoryId: string, wordText: string): WordLibraryData {
  return {
    ...data,
    categories: data.categories.map((c) =>
      c.id === categoryId ? { ...c, words: c.words.filter((w) => w.text !== wordText) } : c
    ),
  };
}

export function editWord(data: WordLibraryData, categoryId: string, oldText: string, newText: string): WordLibraryData {
  const trimmed = newText.trim();
  if (!trimmed) return data;
  return {
    ...data,
    categories: data.categories.map((c) =>
      c.id === categoryId
        ? { ...c, words: c.words.map((w) => w.text === oldText && !w.isSystem ? { ...w, text: trimmed } : w) }
        : c
    ),
  };
}

export function moveWord(data: WordLibraryData, fromId: string, toId: string, wordText: string): WordLibraryData {
  const from = data.categories.find((c) => c.id === fromId);
  if (!from) return data;
  const item = from.words.find((w) => w.text === wordText);
  if (!item) return data;
  const to = data.categories.find((c) => c.id === toId);
  if (!to || to.words.some((w) => w.text === wordText)) return data;
  return {
    ...data,
    categories: data.categories.map((c) => {
      if (c.id === fromId) return { ...c, words: c.words.filter((w) => w.text !== wordText) };
      if (c.id === toId) return { ...c, words: [...c.words, item] };
      return c;
    }),
  };
}

// ============ 抽词相关 ============

export function setSelectedCategory(data: WordLibraryData, categoryId: string | null): WordLibraryData {
  return { ...data, selectedCategoryId: categoryId };
}

export function getWordsForDrawing(data: WordLibraryData, categoryId: string | null): string[] {
  if (categoryId) {
    const cat = data.categories.find((c) => c.id === categoryId);
    return cat ? cat.words.map((w) => w.text) : [];
  }
  return data.categories.filter((c) => !c.isHidden).flatMap((c) => c.words.map((w) => w.text));
}

export function searchWords(data: WordLibraryData, query: string): { categoryId: string; categoryName: string; word: WordItem }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: { categoryId: string; categoryName: string; word: WordItem }[] = [];
  for (const cat of data.categories) {
    for (const word of cat.words) {
      if (word.text.toLowerCase().includes(q)) {
        results.push({ categoryId: cat.id, categoryName: cat.name, word });
      }
    }
  }
  return results;
}

export function getStats(data: WordLibraryData): { totalWords: number; totalCategories: number; systemWords: number; userWords: number } {
  let systemWords = 0, userWords = 0;
  for (const cat of data.categories) {
    for (const w of cat.words) { if (w.isSystem) systemWords++; else userWords++; }
  }
  return { totalWords: systemWords + userWords, totalCategories: data.categories.length, systemWords, userWords };
}
