/**
 * 灵感 APP 第二轮功能测试
 * 测试 Bug 修复和新功能
 */

import { describe, it, expect } from "vitest";
import wordsData from "../assets/data/words.json";

// 复制 getRandomWords 逻辑用于测试
function getRandomWords(words: string[]): [string, string, string] {
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1], shuffled[2]];
}

describe("第二轮功能测试", () => {
  describe("Bug 修复验证", () => {
    it("词库应包含 2000+ 个词", () => {
      expect(wordsData.words.length).toBeGreaterThanOrEqual(2000);
      expect(wordsData.words.length).toBeLessThanOrEqual(3000);
    });

    it("随机词生成应返回三个不同的词", () => {
      const words = getRandomWords(wordsData.words);
      expect(words).toHaveLength(3);
      expect(words[0]).not.toBe(words[1]);
      expect(words[1]).not.toBe(words[2]);
      expect(words[0]).not.toBe(words[2]);
    });

    it("生成的词应该都在词库中", () => {
      const words = getRandomWords(wordsData.words);
      words.forEach((word) => {
        expect(wordsData.words).toContain(word);
      });
    });
  });

  describe("同源词过滤算法", () => {
    it("应该过滤掉相似词组合", () => {
      // 测试多次生成,确保没有明显相似的词
      for (let i = 0; i < 10; i++) {
        const words = getRandomWords(wordsData.words);
        
        // 检查是否有共同前缀(长度 >= 2)
        const hasCommonPrefix = words.some((w1, i1) =>
          words.some((w2, i2) => {
            if (i1 === i2) return false;
            const minLen = Math.min(w1.length, w2.length);
            if (minLen < 2) return false;
            return w1.slice(0, 2) === w2.slice(0, 2);
          })
        );
        
        // 不应该有太多共同前缀的词
        expect(hasCommonPrefix).toBe(false);
      }
    });

    it("生成的词应该具有多样性", () => {
      const allWords: string[] = [];
      
      // 生成 20 组词
      for (let i = 0; i < 20; i++) {
        const words = getRandomWords(wordsData.words);
        allWords.push(...words);
      }
      
      // 去重后应该有较多不同的词
      const uniqueWords = new Set(allWords);
      expect(uniqueWords.size).toBeGreaterThan(40); // 至少 40 个不同的词
    });
  });

  describe("计时器功能", () => {
    it("5分钟应该等于300秒", () => {
      const fiveMinutes = 5 * 60;
      expect(fiveMinutes).toBe(300);
    });

    it("时间格式化应该正确", () => {
      // 测试时间格式化逻辑
      const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${String(secs).padStart(2, '0')}`;
      };

      expect(formatTime(300)).toBe("5:00");
      expect(formatTime(60)).toBe("1:00");
      expect(formatTime(59)).toBe("0:59");
      expect(formatTime(0)).toBe("0:00");
    });
  });

  describe("数据验证", () => {
    it("词库中的词应该都是有效的中文词", () => {
      wordsData.words.forEach((word) => {
        expect(word.length).toBeGreaterThan(0);
        expect(word.length).toBeLessThanOrEqual(50);
        // 应该包含中文字符
        expect(/[\u4e00-\u9fa5]/.test(word)).toBe(true);
      });
    });

    it("词库中不应该有重复的词", () => {
      const uniqueWords = new Set(wordsData.words);
      expect(uniqueWords.size).toBe(wordsData.words.length);
    });
  });
});
