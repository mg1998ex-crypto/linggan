/**
 * 词库管理系统测试
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock categorized_words.json
vi.mock("@/assets/data/categorized_words.json", () => ({
  default: {
    "日用品": ["口罩", "牙刷", "毛巾"],
    "食物饮品": ["苹果", "面包", "牛奶"],
    "动物": ["猫", "狗", "兔子"],
    "其他": ["键盘", "显示器"],
  },
}));

describe("词库数据层", () => {
  let wordLib: typeof import("../lib/word-library");

  beforeEach(async () => {
    vi.resetModules();
    wordLib = await import("../lib/word-library");
  });

  it("应该正确初始化默认词库数据", async () => {
    const data = await wordLib.loadWordLibrary();
    expect(data).toBeDefined();
    expect(data.categories.length).toBeGreaterThan(0);
    expect(data.version).toBe(1);
    expect(data.selectedCategoryId).toBeNull();
  });

  it("应该包含系统预设分类", async () => {
    const data = await wordLib.loadWordLibrary();
    const categoryNames = data.categories.map((c) => c.name);
    expect(categoryNames).toContain("日用品");
    expect(categoryNames).toContain("食物饮品");
    expect(categoryNames).toContain("动物");
    expect(categoryNames).toContain("其他");
  });

  it("系统分类应标记为isSystem=true", async () => {
    const data = await wordLib.loadWordLibrary();
    data.categories.forEach((cat) => {
      expect(cat.isSystem).toBe(true);
    });
  });

  it("应该能创建用户自定义分类", async () => {
    const data = await wordLib.loadWordLibrary();
    const newData = wordLib.createCategory(data, "我的分类");
    const newCat = newData.categories.find((c) => c.name === "我的分类");
    expect(newCat).toBeDefined();
    expect(newCat!.isSystem).toBe(false);
    expect(newCat!.words.length).toBe(0);
  });

  it("应该能重命名用户分类", async () => {
    const data = await wordLib.loadWordLibrary();
    const data2 = wordLib.createCategory(data, "旧名称");
    const cat = data2.categories.find((c) => c.name === "旧名称")!;
    const data3 = wordLib.renameCategory(data2, cat.id, "新名称");
    expect(data3.categories.find((c) => c.id === cat.id)!.name).toBe("新名称");
  });

  it("应该能删除用户分类(词语移入其他)", async () => {
    const data = await wordLib.loadWordLibrary();
    const data2 = wordLib.createCategory(data, "临时分类");
    const cat = data2.categories.find((c) => c.name === "临时分类")!;
    const [data3] = wordLib.addWord(data2, cat.id, "测试词");
    const otherBefore = data3.categories.find((c) => c.name === "其他")!.words.length;
    const data4 = wordLib.deleteCategory(data3, cat.id);
    expect(data4.categories.find((c) => c.name === "临时分类")).toBeUndefined();
    const otherAfter = data4.categories.find((c) => c.name === "其他")!.words.length;
    expect(otherAfter).toBe(otherBefore + 1);
  });

  it("应该能隐藏/显示分类", async () => {
    const data = await wordLib.loadWordLibrary();
    const cat = data.categories[0];
    expect(cat.isHidden).toBe(false);
    const data2 = wordLib.toggleCategoryHidden(data, cat.id);
    expect(data2.categories.find((c) => c.id === cat.id)!.isHidden).toBe(true);
    const data3 = wordLib.toggleCategoryHidden(data2, cat.id);
    expect(data3.categories.find((c) => c.id === cat.id)!.isHidden).toBe(false);
  });

  it("应该能添加单个词语", async () => {
    const data = await wordLib.loadWordLibrary();
    const cat = data.categories[0];
    const [data2, ok] = wordLib.addWord(data, cat.id, "新词语");
    expect(ok).toBe(true);
    expect(data2.categories.find((c) => c.id === cat.id)!.words.some((w) => w.text === "新词语")).toBe(true);
  });

  it("应该拒绝重复词语", async () => {
    const data = await wordLib.loadWordLibrary();
    const cat = data.categories[0];
    const existingWord = cat.words[0].text;
    const [, ok] = wordLib.addWord(data, cat.id, existingWord);
    expect(ok).toBe(false);
  });

  it("应该能批量添加词语并去重", async () => {
    const data = await wordLib.loadWordLibrary();
    const cat = data.categories[0];
    const existingWord = cat.words[0].text;
    const [data2, added, skipped] = wordLib.addWords(data, cat.id, [existingWord, "全新词A", "全新词B", "全新词A"]);
    expect(added).toBe(2);
    expect(skipped).toBe(2); // 1 existing + 1 duplicate in batch
  });

  it("应该能删除词语", async () => {
    const data = await wordLib.loadWordLibrary();
    const cat = data.categories[0];
    const wordToRemove = cat.words[0].text;
    const data2 = wordLib.removeWord(data, cat.id, wordToRemove);
    expect(data2.categories.find((c) => c.id === cat.id)!.words.some((w) => w.text === wordToRemove)).toBe(false);
  });

  it("应该能移动词语到其他分类", async () => {
    const data = await wordLib.loadWordLibrary();
    const fromCat = data.categories[0];
    const toCat = data.categories[1];
    const wordToMove = fromCat.words[0].text;
    const data2 = wordLib.moveWord(data, fromCat.id, toCat.id, wordToMove);
    expect(data2.categories.find((c) => c.id === fromCat.id)!.words.some((w) => w.text === wordToMove)).toBe(false);
    expect(data2.categories.find((c) => c.id === toCat.id)!.words.some((w) => w.text === wordToMove)).toBe(true);
  });

  it("应该能搜索词语", async () => {
    const data = await wordLib.loadWordLibrary();
    const results = wordLib.searchWords(data, "口罩");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].word.text).toBe("口罩");
  });

  it("getWordsForDrawing应返回未隐藏分类的所有词", async () => {
    const data = await wordLib.loadWordLibrary();
    const allWords = wordLib.getWordsForDrawing(data, null);
    expect(allWords.length).toBeGreaterThan(0);
    // 隐藏一个分类后词数应减少
    const data2 = wordLib.toggleCategoryHidden(data, data.categories[0].id);
    const fewerWords = wordLib.getWordsForDrawing(data2, null);
    expect(fewerWords.length).toBeLessThan(allWords.length);
  });

  it("getWordsForDrawing按分类筛选应只返回该分类的词", async () => {
    const data = await wordLib.loadWordLibrary();
    const cat = data.categories[0];
    const catWords = wordLib.getWordsForDrawing(data, cat.id);
    expect(catWords.length).toBe(cat.words.length);
    catWords.forEach((w) => {
      expect(cat.words.some((cw) => cw.text === w)).toBe(true);
    });
  });

  it("应该能设置选中分类", async () => {
    const data = await wordLib.loadWordLibrary();
    const cat = data.categories[0];
    const data2 = wordLib.setSelectedCategory(data, cat.id);
    expect(data2.selectedCategoryId).toBe(cat.id);
    const data3 = wordLib.setSelectedCategory(data2, null);
    expect(data3.selectedCategoryId).toBeNull();
  });

  it("getStats应返回正确统计", async () => {
    const data = await wordLib.loadWordLibrary();
    const stats = wordLib.getStats(data);
    expect(stats.totalCategories).toBe(data.categories.length);
    expect(stats.totalWords).toBeGreaterThan(0);
    expect(stats.systemWords).toBeGreaterThan(0);
    expect(stats.userWords).toBe(0);
  });

  it("编辑词语应更新文本", async () => {
    const data = await wordLib.loadWordLibrary();
    const cat = data.categories[0];
    const [data2] = wordLib.addWord(data, cat.id, "可编辑词");
    const data3 = wordLib.editWord(data2, cat.id, "可编辑词", "已编辑词");
    expect(data3.categories.find((c) => c.id === cat.id)!.words.some((w) => w.text === "已编辑词")).toBe(true);
    expect(data3.categories.find((c) => c.id === cat.id)!.words.some((w) => w.text === "可编辑词")).toBe(false);
  });
});
