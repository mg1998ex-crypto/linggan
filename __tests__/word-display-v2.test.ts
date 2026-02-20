/**
 * 词语显示测试 v2 - 验证手动字体计算确保词语不被截断
 * 针对真机上 adjustsFontSizeToFit 不可靠的问题
 */

import { describe, it, expect } from "vitest";

// 模拟不同设备屏幕宽度
const DEVICES = [
  { name: "iPhone SE", width: 375 },
  { name: "iPhone 14", width: 390 },
  { name: "iPhone 14 Pro Max", width: 430 },
  { name: "Android small", width: 360 },
  { name: "Android medium", width: 393 },
  { name: "Android large", width: 412 },
];

// 与组件中一致的计算逻辑
function calcContainerWidth(screenWidth: number): number {
  return Math.floor((screenWidth - 56) / 3);
}

function calcFontSize(text: string, containerWidth: number): number {
  if (!text) return 24;
  const len = text.length;
  const availableWidth = containerWidth - 8;
  const maxByWidth = Math.floor(availableWidth / (len * 1.15));

  let idealSize: number;
  if (len <= 2) {
    idealSize = 30;
  } else if (len === 3) {
    idealSize = 24;
  } else if (len === 4) {
    idealSize = 20;
  } else {
    idealSize = 17;
  }

  return Math.max(14, Math.min(idealSize, maxByWidth));
}

// 验证词语是否能在一行内显示
function canFitInOneLine(text: string, fontSize: number, containerWidth: number): boolean {
  const availableWidth = containerWidth - 8;
  // 中文字符宽度约为 fontSize * 1.0~1.1(含letterSpacing)
  const textWidth = text.length * fontSize * 1.15;
  return textWidth <= availableWidth;
}

describe("词语显示 v2: 手动字体计算", () => {
  const testWords = [
    "口罩",       // 2字
    "诗集",       // 2字
    "台球桌",     // 3字
    "包屁衣",     // 3字
    "安全带",     // 3字
    "孔雀羽",     // 3字
    "双氧水",     // 3字
    "宠物帽子",   // 4字
    "牛仔帽子",   // 4字
    "蓝牙键盘托", // 5字
  ];

  for (const device of DEVICES) {
    describe(`${device.name} (${device.width}px)`, () => {
      const containerWidth = calcContainerWidth(device.width);

      it(`容器宽度应合理 (>= 100px)`, () => {
        expect(containerWidth).toBeGreaterThanOrEqual(100);
      });

      for (const word of testWords) {
        it(`"${word}" (${word.length}字) 应能在一行内完整显示`, () => {
          const fontSize = calcFontSize(word, containerWidth);
          const fits = canFitInOneLine(word, fontSize, containerWidth);
          
          expect(fontSize).toBeGreaterThanOrEqual(14);
          expect(fits).toBe(true);
        });
      }
    });
  }
});

describe("字体大小合理性", () => {
  const containerWidth = calcContainerWidth(390); // iPhone 14

  it("2字词应使用较大字体", () => {
    const fontSize = calcFontSize("口罩", containerWidth);
    expect(fontSize).toBeGreaterThanOrEqual(28);
  });

  it("3字词应使用中等字体", () => {
    const fontSize = calcFontSize("安全带", containerWidth);
    expect(fontSize).toBeGreaterThanOrEqual(20);
  });

  it("4字词应使用较小字体", () => {
    const fontSize = calcFontSize("宠物帽子", containerWidth);
    expect(fontSize).toBeGreaterThanOrEqual(17);
  });

  it("5字词应使用最小合理字体", () => {
    const fontSize = calcFontSize("蓝牙键盘托", containerWidth);
    expect(fontSize).toBeGreaterThanOrEqual(14);
  });

  it("空字符串应返回默认字体大小", () => {
    const fontSize = calcFontSize("", containerWidth);
    expect(fontSize).toBe(24);
  });
});
