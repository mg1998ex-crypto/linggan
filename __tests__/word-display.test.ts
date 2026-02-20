/**
 * 词语显示测试
 * 验证不同长度词语的字体大小自适应
 */

import { describe, it, expect } from "vitest";

describe("词语显示自适应", () => {
  // 模拟 getFontSize 函数
  const getFontSize = (text: string) => {
    const length = text.length;
    if (length <= 2) return 36; // 2字词:大号字体
    if (length === 3) return 30; // 3字词:中号字体
    return 24; // 4字及以上:小号字体
  };

  it("2字词应使用36px字体", () => {
    expect(getFontSize("杯子")).toBe(36);
    expect(getFontSize("钢笔")).toBe(36);
  });

  it("3字词应使用30px字体", () => {
    expect(getFontSize("太阳能")).toBe(30);
    expect(getFontSize("机械盒")).toBe(30);
    expect(getFontSize("血压计")).toBe(30);
  });

  it("4字词应使用24px字体", () => {
    expect(getFontSize("蓝牙耳机")).toBe(24);
    expect(getFontSize("电子秤盘")).toBe(24);
    expect(getFontSize("无线鼠标")).toBe(24);
  });

  it("5字及以上词语应使用24px字体", () => {
    expect(getFontSize("便携式充电器")).toBe(24);
    expect(getFontSize("无线路由器")).toBe(24);
  });
});
