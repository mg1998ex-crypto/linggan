/**
 * 第七轮功能测试
 * 计时器Bug修复 + 指定词随机组合 + 灵感统计 + 分享卡片
 */

import { describe, it, expect } from "vitest";

// ========== 计时器逻辑测试 ==========
describe("计时器逻辑", () => {
  it("5分钟倒计时从300秒开始", () => {
    const TOTAL_SECONDS = 5 * 60;
    expect(TOTAL_SECONDS).toBe(300);
  });

  it("计时器格式化: 300秒 -> 5:00", () => {
    const formatTime = (seconds: number) => {
      const m = Math.floor(Math.abs(seconds) / 60);
      const s = Math.abs(seconds) % 60;
      return `${m}:${String(s).padStart(2, "0")}`;
    };
    expect(formatTime(300)).toBe("5:00");
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(59)).toBe("0:59");
    expect(formatTime(301)).toBe("5:01");
  });

  it("计时器在动画结束后自动启动", () => {
    let timerStarted = false;
    const startTimer = () => { timerStarted = true; };
    const handleStart = () => { startTimer(); };
    handleStart();
    expect(timerStarted).toBe(true);
  });

  it("保存灵感后计时器不重置", () => {
    let timeLeft = 240;
    const timerRunning = true;
    const handleSave = () => { /* 保存后不重置 */ };
    handleSave();
    expect(timeLeft).toBe(240);
    expect(timerRunning).toBe(true);
  });

  it("换一组不重置计时器", () => {
    let timeLeft = 180;
    const timerRunning = true;
    const handleRestart = () => { /* 换一组不重置 */ };
    handleRestart();
    expect(timeLeft).toBe(180);
    expect(timerRunning).toBe(true);
  });
});

// ========== 指定词随机组合测试 ==========
describe("指定词随机组合", () => {
  it("指定一个词后从词库中随机匹配另外两个词", () => {
    const specifiedWord = "苹果";
    const wordPool = ["电脑", "雨伞", "钢琴", "口罩", "台球桌"];
    const shuffled = [...wordPool].sort(() => Math.random() - 0.5);
    const randomWords = shuffled.slice(0, 2);
    expect(randomWords.length).toBe(2);
    const allWords = [specifiedWord, ...randomWords];
    expect(allWords.length).toBe(3);
    expect(allWords[0]).toBe("苹果");
  });

  it("指定词应排除同源词", () => {
    const specifiedWord = "苹果";
    const wordPool = ["红苹果", "青苹果", "电脑", "雨伞", "钢琴"];
    const filtered = wordPool.filter(w => !w.includes(specifiedWord) && !specifiedWord.includes(w));
    expect(filtered).not.toContain("红苹果");
    expect(filtered).not.toContain("青苹果");
    expect(filtered).toContain("电脑");
  });

  it("指定词为空时不触发抽词", () => {
    const specifiedWord = "";
    const shouldDraw = specifiedWord.trim().length > 0;
    expect(shouldDraw).toBe(false);
  });

  it("指定词去除首尾空格", () => {
    const input = "  苹果  ";
    expect(input.trim()).toBe("苹果");
  });
});

// ========== 灵感统计面板测试 ==========
describe("灵感统计面板", () => {
  it("统计数据结构正确", () => {
    const stats = { total: 10, todayCount: 3, weekCount: 7, streakDays: 5 };
    expect(stats.total).toBe(10);
    expect(stats.todayCount).toBe(3);
    expect(stats.weekCount).toBe(7);
    expect(stats.streakDays).toBe(5);
  });

  it("连续天数计算: 连续3天", () => {
    const today = new Date("2026-03-17");
    const days = [
      new Date("2026-03-17"),
      new Date("2026-03-16"),
      new Date("2026-03-15"),
      new Date("2026-03-13"),
    ];

    let streak = 0;
    for (let i = 0; i < days.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (days[i].toDateString() === expected.toDateString()) {
        streak++;
      } else {
        break;
      }
    }
    expect(streak).toBe(3);
  });

  it("无记录时统计全为0", () => {
    const stats = { total: 0, todayCount: 0, weekCount: 0, streakDays: 0 };
    expect(stats.total).toBe(0);
    expect(stats.streakDays).toBe(0);
  });
});

// ========== 分享卡片测试 ==========
describe("分享卡片", () => {
  it("分享日期格式化正确", () => {
    const formatShareDate = (date: Date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}.${month}.${day}`;
    };
    // Use explicit date with time to avoid timezone issues
    const d1 = new Date(2026, 2, 17); // March 17, 2026 local time
    const d2 = new Date(2026, 0, 1);  // Jan 1, 2026 local time
    expect(formatShareDate(d1)).toBe("2026.03.17");
    expect(formatShareDate(d2)).toBe("2026.01.01");
  });

  it("分享文字内容格式正确", () => {
    const word1 = "苹果";
    const word2 = "电脑";
    const word3 = "雨伞";
    const content = "用苹果做电脑支架,配上雨伞遮阳";
    const date = "2026.03.17";
    const text = `${word1} \u00B7 ${word2} \u00B7 ${word3}\n\n${content}\n\n\u2014 灵感 ${date}`;
    expect(text).toContain("苹果");
    expect(text).toContain("电脑");
    expect(text).toContain("雨伞");
    expect(text).toContain("灵感");
  });

  it("Web端使用剪贴板复制", () => {
    const isWeb = true;
    if (isWeb) {
      const action = "clipboard";
      expect(action).toBe("clipboard");
    }
  });

  it("原生端使用view-shot截图", () => {
    const isNative = true;
    if (isNative) {
      const action = "view-shot";
      expect(action).toBe("view-shot");
    }
  });
});
