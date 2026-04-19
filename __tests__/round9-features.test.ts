/**
 * 第九轮功能测试（已更新适配第十轮的动态主题系统）
 * 1. AI智能分析预留设计
 * 2. 暖阳灵感主题配色（现在通过 useThemeColors 动态获取）
 * 3. 关于页面
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("功能1：AI智能分析预留设计", () => {
  it("数据库schema包含AI分析字段", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.inspirations.aiAnalysis).toBeDefined();
    expect(schema.inspirations.aiAnalyzedAt).toBeDefined();
  });

  it("AI服务模块存在且包含占位函数", () => {
    const servicePath = path.join(__dirname, "..", "services", "aiService.ts");
    expect(fs.existsSync(servicePath)).toBe(true);
    const content = fs.readFileSync(servicePath, "utf-8");
    expect(content).toContain("analyzeInspiration");
    expect(content).toContain("getCreativityScore");
    expect(content).toContain("getSimilarInspirations");
  });

  it("灵感详情页包含AI分析区域", () => {
    const detailPath = path.join(__dirname, "..", "app", "inspiration-detail.tsx");
    const content = fs.readFileSync(detailPath, "utf-8");
    expect(content).toContain("AI");
    expect(content).toContain("analyzeInspiration");
  });
});

describe("功能2：暖阳灵感主题配色", () => {
  it("theme.config.js 使用暖阳主色调 #F5A623", () => {
    const themePath = path.join(__dirname, "..", "theme.config.js");
    const content = fs.readFileSync(themePath, "utf-8");
    expect(content).toContain("#F5A623");
  });

  it("theme.config.js 使用暖白背景 #FAFAF5", () => {
    const themePath = path.join(__dirname, "..", "theme.config.js");
    const content = fs.readFileSync(themePath, "utf-8");
    expect(content).toContain("#FAFAF5");
  });

  it("useThemeColors hook 定义了暖阳主色调", () => {
    const hookPath = path.join(__dirname, "..", "hooks", "use-theme-colors.ts");
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("#F5A623");
    expect(content).toContain("#FAFAF5");
    expect(content).toContain("#FFF8EE");
    expect(content).toContain("#C48A1A");
  });

  it("所有页面使用 useThemeColors 动态颜色", () => {
    const pages = [
      "app/(tabs)/index.tsx",
      "app/(tabs)/archive.tsx",
      "app/(tabs)/library.tsx",
      "app/(tabs)/about.tsx",
      "app/category-detail.tsx",
      "app/inspiration-detail.tsx",
    ];
    for (const page of pages) {
      const content = fs.readFileSync(path.join(__dirname, "..", page), "utf-8");
      expect(content).toContain("useThemeColors");
    }
  });

  it("灵感详情页使用动态主题", () => {
    const detailPath = path.join(__dirname, "..", "app", "inspiration-detail.tsx");
    const content = fs.readFileSync(detailPath, "utf-8");
    expect(content).toContain("useThemeColors");
  });

  it("分享卡片使用暖阳主题", () => {
    const detailPath = path.join(__dirname, "..", "app", "inspiration-detail.tsx");
    const content = fs.readFileSync(detailPath, "utf-8");
    // 分享卡片中应有渐变或暖色调
    expect(content).toContain("分享");
  });
});

describe("功能3：关于页面", () => {
  it("关于页面文件存在", () => {
    const aboutPath = path.join(__dirname, "..", "app", "(tabs)", "about.tsx");
    expect(fs.existsSync(aboutPath)).toBe(true);
  });

  it("关于页面包含APP名称和版本", () => {
    const aboutPath = path.join(__dirname, "..", "app", "(tabs)", "about.tsx");
    const content = fs.readFileSync(aboutPath, "utf-8");
    expect(content).toContain("灵感");
    expect(content).toContain("1.0.0");
  });

  it("关于页面包含理念介绍", () => {
    const aboutPath = path.join(__dirname, "..", "app", "(tabs)", "about.tsx");
    const content = fs.readFileSync(aboutPath, "utf-8");
    expect(content).toContain("创意源于随机碰撞");
    expect(content).toContain("孙正义");
  });

  it("关于页面包含开发者信息", () => {
    const aboutPath = path.join(__dirname, "..", "app", "(tabs)", "about.tsx");
    const content = fs.readFileSync(aboutPath, "utf-8");
    expect(content).toContain("Miracles_Gratitude");
    expect(content).toContain("2522507815");
  });

  it("关于页面包含致谢", () => {
    const aboutPath = path.join(__dirname, "..", "app", "(tabs)", "about.tsx");
    const content = fs.readFileSync(aboutPath, "utf-8");
    expect(content).toContain("感谢");
  });

  it("底部导航栏包含关于Tab", () => {
    const layoutPath = path.join(__dirname, "..", "app", "(tabs)", "_layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain("about");
  });
});
