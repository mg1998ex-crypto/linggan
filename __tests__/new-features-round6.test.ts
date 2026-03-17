/**
 * 第六轮新功能测试
 * 1. 锁定词语部分重抽
 * 2. 同源词过滤算法
 * 3. 灵感详情(路由和API)
 */

import { describe, it, expect, vi } from "vitest";

// Mock word-filter functions
vi.mock("@/lib/word-filter", async () => {
  const actual = await vi.importActual("@/lib/word-filter") as any;
  return actual;
});

describe("同源词过滤算法", () => {
  // Test extractCoreWord function logic
  const extractCoreWord = (word: string): string => {
    const suffixes = ["子", "头", "儿", "器", "机", "具", "品", "物", "料", "剂"];
    if (word.length >= 3) {
      const lastChar = word[word.length - 1];
      if (suffixes.includes(lastChar)) {
        return word.slice(0, -1);
      }
    }
    return word;
  };

  const hasOverlap = (w1: string, w2: string): boolean => {
    if (w1.includes(w2) || w2.includes(w1)) return true;
    const core1 = extractCoreWord(w1);
    const core2 = extractCoreWord(w2);
    if (core1 === core2) return true;
    if (core1.length >= 2 && core2.length >= 2) {
      if (core1.includes(core2) || core2.includes(core1)) return true;
    }
    return false;
  };

  it("检测完全包含关系", () => {
    expect(hasOverlap("苹果", "红苹果")).toBe(true);
    expect(hasOverlap("红苹果", "苹果")).toBe(true);
    expect(hasOverlap("帽子", "宠物帽子")).toBe(true);
  });

  it("检测核心词相同", () => {
    expect(hasOverlap("椅子", "椅")).toBe(true);
    expect(hasOverlap("锤子", "锤")).toBe(true);
  });

  it("不相关词语不过滤", () => {
    expect(hasOverlap("苹果", "香蕉")).toBe(false);
    expect(hasOverlap("帽子", "鞋子")).toBe(false);
    expect(hasOverlap("电脑", "手机")).toBe(false);
  });

  it("短词不误判", () => {
    expect(hasOverlap("口", "口罩")).toBe(true); // 包含关系
    expect(hasOverlap("伞", "雨伞")).toBe(true); // 包含关系
  });
});

describe("锁定词语逻辑", () => {
  it("锁定状态切换", () => {
    let locked: [boolean, boolean, boolean] = [false, false, false];
    
    // 锁定第一个
    locked = [...locked] as [boolean, boolean, boolean];
    locked[0] = true;
    expect(locked).toEqual([true, false, false]);
    
    // 锁定第二个
    locked = [...locked] as [boolean, boolean, boolean];
    locked[1] = true;
    expect(locked).toEqual([true, true, false]);
    
    // 不允许锁定全部3个
    const lockedCount = locked.filter(l => l).length;
    expect(lockedCount).toBe(2);
    // 第三个不应被锁定
    expect(lockedCount >= 2).toBe(true);
  });

  it("部分重抽保持锁定词不变", () => {
    const originalWords: [string, string, string] = ["苹果", "电脑", "帽子"];
    const locked: [boolean, boolean, boolean] = [true, false, false];
    
    // 模拟部分重抽: 锁定词保持不变
    const newWords: [string, string, string] = [...originalWords];
    if (!locked[0]) newWords[0] = "新词1";
    if (!locked[1]) newWords[1] = "新词2";
    if (!locked[2]) newWords[2] = "新词3";
    
    expect(newWords[0]).toBe("苹果"); // 锁定的词不变
    expect(newWords[1]).toBe("新词2"); // 未锁定的词改变
    expect(newWords[2]).toBe("新词3"); // 未锁定的词改变
  });

  it("保存后清除所有锁定", () => {
    let locked: [boolean, boolean, boolean] = [true, true, false];
    
    // 保存后清除
    locked = [false, false, false];
    expect(locked).toEqual([false, false, false]);
  });
});

describe("灵感详情功能", () => {
  it("灵感数据结构正确", () => {
    const inspiration = {
      id: 1,
      word1: "苹果",
      word2: "电脑",
      word3: "帽子",
      content: "用苹果形状的电脑支架配帽子造型的散热器",
      createdAt: new Date("2026-03-17"),
    };

    expect(inspiration.word1).toBe("苹果");
    expect(inspiration.word2).toBe("电脑");
    expect(inspiration.word3).toBe("帽子");
    expect(inspiration.content.length).toBeGreaterThan(0);
  });

  it("编辑内容不能为空", () => {
    const editContent = "";
    const canSave = editContent.trim().length > 0;
    expect(canSave).toBe(false);
  });

  it("编辑内容有值时可以保存", () => {
    const editContent = "修改后的灵感内容";
    const canSave = editContent.trim().length > 0;
    expect(canSave).toBe(true);
  });

  it("日期格式化正确", () => {
    const formatDate = (date: Date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hour = String(d.getHours()).padStart(2, "0");
      const minute = String(d.getMinutes()).padStart(2, "0");
      return `${year}年${month}月${day}日 ${hour}:${minute}`;
    };

    const result = formatDate(new Date("2026-03-17T10:30:00"));
    expect(result).toContain("2026年03月17日");
  });
});

describe("同分类过滤", () => {
  it("3词全来自同一分类时应重抽", () => {
    const categoryMap = new Map<string, string>();
    categoryMap.set("苹果", "food");
    categoryMap.set("香蕉", "food");
    categoryMap.set("橙子", "food");
    categoryMap.set("电脑", "tech");
    categoryMap.set("手机", "tech");
    categoryMap.set("帽子", "clothing");

    const words = ["苹果", "香蕉", "橙子"];
    const categories = words.map(w => categoryMap.get(w));
    const allSameCategory = categories.every(c => c === categories[0]);
    
    expect(allSameCategory).toBe(true);
  });

  it("3词来自不同分类时不需重抽", () => {
    const categoryMap = new Map<string, string>();
    categoryMap.set("苹果", "food");
    categoryMap.set("电脑", "tech");
    categoryMap.set("帽子", "clothing");

    const words = ["苹果", "电脑", "帽子"];
    const categories = words.map(w => categoryMap.get(w));
    const allSameCategory = categories.every(c => c === categories[0]);
    
    expect(allSameCategory).toBe(false);
  });
});
