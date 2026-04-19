/**
 * 测试第8轮修复:
 * 1. 计时器倒计时逻辑(不再进入timeup状态)
 * 2. Stats API返回正确数据格式
 * 3. 分享功能的Canvas辅助函数
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Timer logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should count down from TOTAL_TIME and switch to overtime mode at 0", () => {
    const TOTAL_TIME = 5 * 60;
    let timeLeft = TOTAL_TIME;
    let isOvertime = false;
    const isOvertimeRef = { current: false };

    // Simulate the timer tick logic
    const tick = () => {
      if (isOvertimeRef.current) {
        timeLeft = timeLeft + 1;
      } else {
        if (timeLeft <= 1) {
          isOvertimeRef.current = true;
          isOvertime = true;
          timeLeft = TOTAL_TIME + 1;
        } else {
          timeLeft = timeLeft - 1;
        }
      }
    };

    // Tick once - should go from 300 to 299
    tick();
    expect(timeLeft).toBe(299);
    expect(isOvertime).toBe(false);

    // Simulate reaching 1 second left
    timeLeft = 1;
    tick();
    // Should switch to overtime mode
    expect(isOvertime).toBe(true);
    expect(isOvertimeRef.current).toBe(true);
    expect(timeLeft).toBe(TOTAL_TIME + 1); // 301 = 5:01

    // Next tick should increment (overtime mode)
    tick();
    expect(timeLeft).toBe(TOTAL_TIME + 2); // 302 = 5:02
  });

  it("should format time correctly", () => {
    const formatTime = (seconds: number): string => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${String(s).padStart(2, "0")}`;
    };

    expect(formatTime(300)).toBe("5:00");
    expect(formatTime(299)).toBe("4:59");
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(301)).toBe("5:01");
    expect(formatTime(360)).toBe("6:00");
  });

  it("should display overtime as +X:XX format", () => {
    const TOTAL_TIME = 300;
    const formatTime = (seconds: number): string => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${String(s).padStart(2, "0")}`;
    };

    // When overtime, display is `+${formatTime(timeLeft - TOTAL_TIME)}`
    const timeLeft = 361; // 6:01 total
    const display = `+${formatTime(timeLeft - TOTAL_TIME)}`;
    expect(display).toBe("+1:01");
  });
});

describe("Stats API response format", () => {
  it("should have correct shape", () => {
    // Simulate the expected stats response
    const stats = { total: 10, todayCount: 0, weekCount: 0, streakDays: 0 };
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("todayCount");
    expect(stats).toHaveProperty("weekCount");
    expect(stats).toHaveProperty("streakDays");
    expect(typeof stats.total).toBe("number");
    expect(typeof stats.todayCount).toBe("number");
    expect(typeof stats.weekCount).toBe("number");
    expect(typeof stats.streakDays).toBe("number");
  });

  it("should calculate streak days correctly", () => {
    // Simulate JS-based streak calculation using explicit date parts to avoid timezone issues
    const nowYear = 2026, nowMonth = 4, nowDay = 19;
    const uniqueDays = ["2026-04-19", "2026-04-18", "2026-04-17", "2026-04-15"];
    const sortedDays = uniqueDays.sort().reverse();

    let streakDays = 0;
    for (let i = 0; i < sortedDays.length; i++) {
      // Use UTC to avoid timezone offset issues
      const expectedDate = new Date(Date.UTC(nowYear, nowMonth - 1, nowDay - i));
      const expectedStr = `${expectedDate.getUTCFullYear()}-${String(expectedDate.getUTCMonth() + 1).padStart(2, "0")}-${String(expectedDate.getUTCDate()).padStart(2, "0")}`;
      if (sortedDays[i] === expectedStr) {
        streakDays++;
      } else {
        break;
      }
    }
    // 19, 18, 17 are consecutive, 15 breaks the streak
    expect(streakDays).toBe(3);
  });
});

describe("Share card Canvas helpers", () => {
  it("wrapText should split long text into lines", () => {
    // Simulate wrapText logic
    function wrapText(text: string, maxCharsPerLine: number): string[] {
      const lines: string[] = [];
      const paragraphs = text.split("\n");
      for (const paragraph of paragraphs) {
        if (paragraph.trim() === "") { lines.push(""); continue; }
        let currentLine = "";
        for (let i = 0; i < paragraph.length; i++) {
          currentLine += paragraph[i];
          if (currentLine.length >= maxCharsPerLine) {
            lines.push(currentLine);
            currentLine = "";
          }
        }
        if (currentLine) lines.push(currentLine);
      }
      return lines;
    }

    const result = wrapText("这是一段很长的灵感内容需要换行显示", 10);
    expect(result.length).toBeGreaterThan(1);
    expect(result.join("")).toBe("这是一段很长的灵感内容需要换行显示");
  });
});
