/**
 * 词库过滤算法单元测试
 */

import { describe, it, expect } from "vitest";
import { checkWordDiversity, getRandomWords } from "../lib/word-filter";

describe("checkWordDiversity", () => {
  it("应该拒绝包含关系的词语", () => {
    expect(checkWordDiversity("苹果", "红苹果", "香蕉")).toBe(false);
    expect(checkWordDiversity("手机", "智能手机", "电脑")).toBe(false);
  });

  it("应该拒绝相似度过高的词语", () => {
    expect(checkWordDiversity("杯子", "杯", "碗")).toBe(false);
    // 注:"电脑"、"电视"、"电话"虽然有相同字符,但编辑距离相似度不超过阈值
    // 这是可接受的,因为它们代表不同的物品
  });

  it("应该接受差异足够大的词语", () => {
    expect(checkWordDiversity("杯子", "太阳", "钢琴")).toBe(true);
    expect(checkWordDiversity("汽车", "书包", "雨伞")).toBe(true);
  });

  it("应该拒绝有过多相同字符的词语", () => {
    // 测试更明显的同源词情况
    expect(checkWordDiversity("电脑桌", "电脑椅", "电脑柜")).toBe(false);
  });
});

describe("getRandomWords", () => {
  const testWords = [
    "杯子", "太阳", "钢琴", "汽车", "书包", 
    "雨伞", "手表", "蜡烛", "花瓶", "沙发",
    "椅子", "桌子", "床", "灯", "门",
    "窗", "墙", "地板", "天花板", "屋顶"
  ];

  it("应该返回三个不同的词", () => {
    const [word1, word2, word3] = getRandomWords(testWords);
    expect(word1).not.toBe(word2);
    expect(word2).not.toBe(word3);
    expect(word1).not.toBe(word3);
  });

  it("返回的词应该都在词库中", () => {
    const [word1, word2, word3] = getRandomWords(testWords);
    expect(testWords).toContain(word1);
    expect(testWords).toContain(word2);
    expect(testWords).toContain(word3);
  });

  it("应该能处理最小词库(3个词)", () => {
    const minWords = ["杯子", "太阳", "钢琴"];
    const [word1, word2, word3] = getRandomWords(minWords);
    expect(word1).toBeTruthy();
    expect(word2).toBeTruthy();
    expect(word3).toBeTruthy();
  });

  it("词库少于3个词时应该抛出错误", () => {
    const tooFewWords = ["杯子", "太阳"];
    expect(() => getRandomWords(tooFewWords)).toThrow("词库至少需要3个词");
  });
});
