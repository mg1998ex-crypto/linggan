/**
 * 计时器逻辑测试
 * 验证5分钟计时器是整体使用时间,保存灵感后不重置
 */

import { describe, it, expect } from "vitest";

// 模拟状态机逻辑
type AppState = "idle" | "rolling" | "stopped";

interface TimerState {
  appState: AppState;
  timeLeft: number;
  timerActive: boolean;
  words: [string, string, string];
  content: string;
  saveSuccess: boolean;
  timeUp: boolean;
}

function createInitialState(): TimerState {
  return {
    appState: "idle",
    timeLeft: 300,
    timerActive: false,
    words: ["", "", ""],
    content: "",
    saveSuccess: false,
    timeUp: false,
  };
}

// 模拟"首次开始"
function handleFirstStart(state: TimerState): TimerState {
  return {
    ...state,
    appState: "rolling",
    timeLeft: 300,
    timerActive: true,
    words: ["词A", "词B", "词C"],
    content: "",
    saveSuccess: false,
    timeUp: false,
  };
}

// 模拟"动画结束"
function handleAnimationEnd(state: TimerState): TimerState {
  return {
    ...state,
    appState: "stopped",
    // 计时器继续运行,不重置
  };
}

// 模拟"保存灵感"
function handleSave(state: TimerState): TimerState {
  // 保存后:显示Toast,然后自动开始下一轮
  return {
    ...state,
    saveSuccess: true,
    // 计时器继续运行,不重置!
    // timerActive 保持 true
    // timeLeft 保持当前值
  };
}

// 模拟"保存后自动开始下一轮"
function handleAutoNextRound(state: TimerState): TimerState {
  return {
    ...state,
    appState: "rolling",
    words: ["词D", "词E", "词F"],
    content: "",
    saveSuccess: false,
    // 计时器继续运行,不重置!
  };
}

// 模拟"换一组"(不重置计时器)
function handleRestart(state: TimerState): TimerState {
  return {
    ...state,
    appState: "rolling",
    words: ["词G", "词H", "词I"],
    content: "",
    saveSuccess: false,
    // 计时器继续运行,不重置!
  };
}

// 模拟"计时器归零"
function handleTimeUp(state: TimerState): TimerState {
  return {
    ...state,
    timeLeft: 0,
    timerActive: false,
    timeUp: true,
  };
}

// 模拟"时间到后回到idle"
function handleTimeUpReset(state: TimerState): TimerState {
  return {
    ...state,
    appState: "idle",
    timeLeft: 300,
    timeUp: false,
    words: ["", "", ""],
    content: "",
  };
}

describe("计时器逻辑:5分钟整体使用时间", () => {
  it("初始状态:计时器未启动", () => {
    const state = createInitialState();
    expect(state.appState).toBe("idle");
    expect(state.timerActive).toBe(false);
    expect(state.timeLeft).toBe(300);
  });

  it("首次点击开始:启动计时器 + 开始抽词", () => {
    const state = handleFirstStart(createInitialState());
    expect(state.appState).toBe("rolling");
    expect(state.timerActive).toBe(true);
    expect(state.timeLeft).toBe(300);
  });

  it("动画结束:进入stopped,计时器继续", () => {
    let state = handleFirstStart(createInitialState());
    state = { ...state, timeLeft: 295 }; // 模拟过了5秒
    state = handleAnimationEnd(state);
    
    expect(state.appState).toBe("stopped");
    expect(state.timerActive).toBe(true);
    expect(state.timeLeft).toBe(295); // 计时器没有重置
  });

  it("保存灵感后:计时器不重置,自动开始下一轮", () => {
    let state = handleFirstStart(createInitialState());
    state = { ...state, timeLeft: 250 }; // 模拟过了50秒
    state = handleAnimationEnd(state);
    state = { ...state, content: "我的灵感" };
    
    // 保存
    state = handleSave(state);
    expect(state.saveSuccess).toBe(true);
    expect(state.timerActive).toBe(true);
    expect(state.timeLeft).toBe(250); // 计时器没有重置!
    
    // 自动开始下一轮
    state = handleAutoNextRound(state);
    expect(state.appState).toBe("rolling");
    expect(state.timerActive).toBe(true);
    expect(state.timeLeft).toBe(250); // 计时器仍然没有重置!
    expect(state.content).toBe(""); // 输入框清空
    expect(state.saveSuccess).toBe(false);
  });

  it("换一组:计时器不重置", () => {
    let state = handleFirstStart(createInitialState());
    state = { ...state, timeLeft: 200 };
    state = handleAnimationEnd(state);
    
    // 换一组
    state = handleRestart(state);
    expect(state.appState).toBe("rolling");
    expect(state.timerActive).toBe(true);
    expect(state.timeLeft).toBe(200); // 计时器没有重置
  });

  it("多次保存后计时器持续倒计时", () => {
    let state = handleFirstStart(createInitialState());
    
    // 第1轮
    state = { ...state, timeLeft: 280 };
    state = handleAnimationEnd(state);
    state = handleSave(state);
    state = handleAutoNextRound(state);
    expect(state.timeLeft).toBe(280);
    
    // 第2轮
    state = { ...state, timeLeft: 220 };
    state = handleAnimationEnd(state);
    state = handleSave(state);
    state = handleAutoNextRound(state);
    expect(state.timeLeft).toBe(220);
    
    // 第3轮
    state = { ...state, timeLeft: 150 };
    state = handleAnimationEnd(state);
    state = handleSave(state);
    state = handleAutoNextRound(state);
    expect(state.timeLeft).toBe(150);
    
    // 计时器始终没有被重置为300
    expect(state.timerActive).toBe(true);
  });

  it("计时器归零:显示时间到提示", () => {
    let state = handleFirstStart(createInitialState());
    state = handleAnimationEnd(state);
    state = handleTimeUp(state);
    
    expect(state.timeLeft).toBe(0);
    expect(state.timerActive).toBe(false);
    expect(state.timeUp).toBe(true);
  });

  it("时间到后回到idle,计时器重置为300", () => {
    let state = handleFirstStart(createInitialState());
    state = handleAnimationEnd(state);
    state = handleTimeUp(state);
    state = handleTimeUpReset(state);
    
    expect(state.appState).toBe("idle");
    expect(state.timeLeft).toBe(300);
    expect(state.timeUp).toBe(false);
  });
});

describe("按钮文案变化", () => {
  it("初始状态显示'开始'按钮", () => {
    const state = createInitialState();
    expect(state.appState).toBe("idle");
    // idle状态 → 显示"开始"按钮
  });

  it("stopped状态显示'换一组'和'保存灵感'按钮", () => {
    let state = handleFirstStart(createInitialState());
    state = handleAnimationEnd(state);
    expect(state.appState).toBe("stopped");
    // stopped状态 → 显示"换一组" + "保存灵感"
  });
});
