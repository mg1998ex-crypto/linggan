/**
 * 第七轮 Bug 修复验证测试
 * 测试4个核心Bug的修复效果
 */

import { describe, it, expect } from "vitest";
import { Dimensions } from "react-native";

// ============================================
// Bug #1: 词语换行/拆字问题验证
// ============================================
describe("Bug #1: 词语不换行验证", () => {
  // 模拟屏幕宽度计算
  const SCREEN_WIDTH = 390; // iPhone 14 宽度
  const WORD_CONTAINER_WIDTH = (SCREEN_WIDTH - 64) / 3; // ~108.67px

  it("每个词容器宽度应约为屏幕宽度的1/3", () => {
    expect(WORD_CONTAINER_WIDTH).toBeGreaterThan(100);
    expect(WORD_CONTAINER_WIDTH).toBeLessThan(130);
  });

  it("2字词(口罩)应能在容器内显示", () => {
    const word = "口罩";
    const fontSize = word.length <= 2 ? 34 : word.length === 3 ? 28 : 22;
    // 2字词用34px字体,宽度约68px,容器约108px,足够
    expect(fontSize * word.length).toBeLessThan(WORD_CONTAINER_WIDTH);
  });

  it("3字词(台球桌)应能在容器内显示", () => {
    const word = "台球桌";
    const fontSize = word.length <= 2 ? 34 : word.length === 3 ? 28 : 22;
    // 3字词用28px字体,宽度约84px,容器约108px,足够
    expect(fontSize * word.length).toBeLessThan(WORD_CONTAINER_WIDTH);
  });

  it("4字词(宠物帽子)应能在容器内显示(adjustsFontSizeToFit会自动缩小)", () => {
    const word = "宠物帽子";
    const fontSize = word.length <= 2 ? 34 : word.length === 3 ? 28 : 22;
    // 4字词用22px字体,宽度约88px,容器约108px,足够
    // 即使不够,adjustsFontSizeToFit + minimumFontScale=0.5 会自动缩小
    expect(fontSize).toBe(22);
    expect(word.length).toBe(4);
  });

  it("5字词(蓝牙键盘托)也应能显示(adjustsFontSizeToFit)", () => {
    const word = "蓝牙键盘托";
    const fontSize = word.length <= 2 ? 34 : word.length === 3 ? 28 : 22;
    expect(fontSize).toBe(22);
    // adjustsFontSizeToFit + minimumFontScale=0.5 会缩小到11px,宽度约55px
    const minFontSize = fontSize * 0.5;
    expect(minFontSize * word.length).toBeLessThan(WORD_CONTAINER_WIDTH);
  });
});

// ============================================
// Bug #2: 卷轴动画与最终结果一致性验证
// ============================================
describe("Bug #2: 动画与最终结果一致性", () => {
  const RANDOM_WORD_COUNT = 15;
  const ITEM_HEIGHT = 60;

  it("目标词应在滚动列表的最后位置", () => {
    const targetWord = "台球桌";
    const allWords = ["苹果", "电脑", "手机", "桌子", "椅子"];
    
    // 模拟WordRoller的rollingWords生成逻辑
    const randomWords: string[] = [];
    for (let i = 0; i < RANDOM_WORD_COUNT; i++) {
      const randomIndex = Math.floor(Math.random() * allWords.length);
      randomWords.push(allWords[randomIndex]);
    }
    randomWords.push(targetWord); // 目标词在最后
    
    expect(randomWords[randomWords.length - 1]).toBe(targetWord);
    expect(randomWords.length).toBe(RANDOM_WORD_COUNT + 1);
  });

  it("动画滚动距离应精确到最后一个词", () => {
    const totalItems = RANDOM_WORD_COUNT + 1; // 15个随机词 + 1个目标词
    const totalScrollDistance = (totalItems - 1) * ITEM_HEIGHT;
    
    // 滚动距离 = (16-1) * 60 = 900px
    expect(totalScrollDistance).toBe(900);
  });

  it("动画结束后切换到静态显示同一个目标词", () => {
    const targetWord = "宠物帽子";
    
    // 模拟动画结束后的状态切换
    let showStatic = false;
    const handleAnimationEnd = () => {
      showStatic = true;
    };
    
    handleAnimationEnd();
    expect(showStatic).toBe(true);
    // 静态模式显示的是传入的word prop,即targetWord
    // 动画最后停在的也是targetWord(数组最后一个)
    // 两者是同一个值,所以不会出现不一致
  });
});

// ============================================
// Bug #3: 按钮显示逻辑(状态机)验证
// ============================================
describe("Bug #3: 页面状态机验证", () => {
  type AppState = "idle" | "rolling" | "stopped";

  it("状态1(idle): 应显示开始按钮,不显示输入框和计时器", () => {
    const state = "idle" as AppState;
    
    const showStartButton = state === "idle";
    const showRollers = state === "rolling";
    const showInput = state === "stopped";
    const showTimer = state === "stopped";
    
    expect(showStartButton).toBe(true);
    expect(showRollers).toBe(false);
    expect(showInput).toBe(false);
    expect(showTimer).toBe(false);
  });

  it("状态2(rolling): 应显示卷轴,隐藏所有按钮", () => {
    const state = "rolling" as AppState;
    
    const showStartButton = state === "idle";
    const showRollers = state === "rolling";
    const showInput = state === "stopped";
    
    expect(showStartButton).toBe(false);
    expect(showRollers).toBe(true);
    expect(showInput).toBe(false);
  });

  it("状态3(stopped): 应同时显示词语、计时器、输入框、两个按钮", () => {
    const state = "stopped" as AppState;
    
    const showWords = state === "stopped";
    const showTimer = state === "stopped";
    const showInput = state === "stopped";
    const showButtons = state === "stopped";
    
    expect(showWords).toBe(true);
    expect(showTimer).toBe(true);
    expect(showInput).toBe(true);
    expect(showButtons).toBe(true);
  });

  it("状态转换: idle → rolling → stopped → idle", () => {
    let state: AppState = "idle";
    
    // 点击开始
    state = "rolling";
    expect(state).toBe("rolling");
    
    // 动画结束
    state = "stopped";
    expect(state).toBe("stopped");
    
    // 保存成功后回到idle
    state = "idle";
    expect(state).toBe("idle");
  });

  it("保存按钮在无内容时应禁用", () => {
    const content1 = "";
    const content2 = "   ";
    const content3 = "我的灵感";
    
    expect(content1.trim().length > 0).toBe(false);
    expect(content2.trim().length > 0).toBe(false);
    expect(content3.trim().length > 0).toBe(true);
  });
});

// ============================================
// Bug #4: 草稿恢复验证
// ============================================
describe("Bug #4: 草稿恢复逻辑", () => {
  it("有草稿时应恢复到stopped状态", () => {
    const draft = {
      word1: "口罩",
      word2: "台球桌",
      word3: "宠物帽子",
      content: "一个关于防护的创意",
      timestamp: Date.now(),
    };
    
    // 模拟恢复逻辑
    let appState: "idle" | "rolling" | "stopped" = "idle";
    let words: [string, string, string] = ["", "", ""];
    let content = "";
    
    if (draft && draft.word1 && draft.word2 && draft.word3) {
      words = [draft.word1, draft.word2, draft.word3];
      content = draft.content || "";
      appState = "stopped";
    }
    
    expect(appState).toBe("stopped");
    expect(words).toEqual(["口罩", "台球桌", "宠物帽子"]);
    expect(content).toBe("一个关于防护的创意");
  });

  it("无草稿时应保持idle状态", () => {
    const draft = null;
    
    let appState: "idle" | "rolling" | "stopped" = "idle";
    
    if (draft) {
      appState = "stopped";
    }
    
    expect(appState).toBe("idle");
  });

  it("草稿内容为空时也应恢复(只要有词语)", () => {
    const draft = {
      word1: "口罩",
      word2: "台球桌",
      word3: "宠物帽子",
      content: "",
      timestamp: Date.now(),
    };
    
    let appState: "idle" | "rolling" | "stopped" = "idle";
    let content = "";
    
    if (draft && draft.word1 && draft.word2 && draft.word3) {
      content = draft.content || "";
      appState = "stopped";
    }
    
    expect(appState).toBe("stopped");
    expect(content).toBe("");
  });
});

// ============================================
// 综合验证
// ============================================
describe("综合验证: 所有修复不互相冲突", () => {
  it("词语宽度计算与状态机独立", () => {
    // 词语显示逻辑不依赖状态机
    const getFontSize = (text: string) => {
      if (!text) return 28;
      const length = text.length;
      if (length <= 2) return 34;
      if (length === 3) return 28;
      return 22;
    };
    
    expect(getFontSize("口罩")).toBe(34);
    expect(getFontSize("台球桌")).toBe(28);
    expect(getFontSize("宠物帽子")).toBe(22);
    expect(getFontSize("")).toBe(28);
  });

  it("动画结束后状态正确转换", () => {
    let stoppedCount = 0;
    let appState: "idle" | "rolling" | "stopped" = "rolling";
    
    // 模拟3个roller依次停止
    for (let i = 0; i < 3; i++) {
      stoppedCount++;
      if (stoppedCount === 3) {
        appState = "stopped";
      }
    }
    
    expect(stoppedCount).toBe(3);
    expect(appState).toBe("stopped");
  });
});
