import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "web" },
  Share: { share: vi.fn() },
}));

import { buildAIAnalysisPrompt } from "../services/aiHandoff";

describe("AI handoff prompt", () => {
  it("includes all three words and the user's idea", () => {
    const prompt = buildAIAnalysisPrompt(["眼镜", "老人", "药盒"], "做一个服药提醒设备");

    expect(prompt).toContain("眼镜 × 老人 × 药盒");
    expect(prompt).toContain("做一个服药提醒设备");
  });

  it("asks for concrete product and validation analysis", () => {
    const prompt = buildAIAnalysisPrompt(["A", "B", "C"], "测试想法");

    expect(prompt).toContain("商业可能");
    expect(prompt).toContain("风险提醒");
    expect(prompt).toContain("最小验证行动");
    expect(prompt).toContain("不要只给泛泛的鼓励");
  });
});
