/**
 * 第九轮功能测试
 * 1. AI服务模块占位接口
 * 2. 暖阳主题配色
 * 3. 关于页面
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("功能1：AI智能分析预留设计", () => {
  it("aiService.ts 文件存在", () => {
    const filePath = path.join(__dirname, "..", "services", "aiService.ts");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("aiService.ts 导出 analyzeInspiration 函数", async () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "services", "aiService.ts"),
      "utf-8"
    );
    expect(content).toContain("analyzeInspiration");
    expect(content).toContain("Promise<string>");
  });

  it("aiService.ts 导出 getCreativityScore 函数", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "services", "aiService.ts"),
      "utf-8"
    );
    expect(content).toContain("getCreativityScore");
    expect(content).toContain("Promise<number>");
  });

  it("aiService.ts 导出 getSimilarInspirations 函数", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "services", "aiService.ts"),
      "utf-8"
    );
    expect(content).toContain("getSimilarInspirations");
    expect(content).toContain("Promise<");
  });

  it("数据库schema包含ai_analysis字段", () => {
    const schemaPath = path.join(__dirname, "..", "drizzle", "schema.ts");
    const content = fs.readFileSync(schemaPath, "utf-8");
    expect(content).toContain("aiAnalysis");
  });

  it("数据库schema包含ai_analyzed_at字段", () => {
    const schemaPath = path.join(__dirname, "..", "drizzle", "schema.ts");
    const content = fs.readFileSync(schemaPath, "utf-8");
    expect(content).toContain("aiAnalyzedAt");
  });

  it("灵感详情页包含AI分析占位区域", () => {
    const detailPath = path.join(__dirname, "..", "app", "inspiration-detail.tsx");
    const content = fs.readFileSync(detailPath, "utf-8");
    expect(content).toContain("AI 创意分析");
    expect(content).toContain("即将推出");
    expect(content).toContain("创意解读");
    expect(content).toContain("创意评分");
    expect(content).toContain("相似灵感");
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

  it("主页面使用暖阳主色调按钮", () => {
    const indexPath = path.join(__dirname, "..", "app", "(tabs)", "index.tsx");
    const content = fs.readFileSync(indexPath, "utf-8");
    expect(content).toContain("#F5A623");
    // 开始按钮应该是暖阳色
    expect(content).toContain('backgroundColor: "#F5A623"');
  });

  it("灵感列表页使用暖阳主题", () => {
    const archivePath = path.join(__dirname, "..", "app", "(tabs)", "archive.tsx");
    const content = fs.readFileSync(archivePath, "utf-8");
    expect(content).toContain("#F5A623");
    expect(content).toContain("#FFF8EE");
  });

  it("词库管理页使用暖阳主题", () => {
    const libraryPath = path.join(__dirname, "..", "app", "(tabs)", "library.tsx");
    const content = fs.readFileSync(libraryPath, "utf-8");
    expect(content).toContain("#F5A623");
    expect(content).toContain("#FFF8EE");
  });

  it("分类详情页使用暖阳主题", () => {
    const detailPath = path.join(__dirname, "..", "app", "category-detail.tsx");
    const content = fs.readFileSync(detailPath, "utf-8");
    expect(content).toContain("#F5A623");
    expect(content).toContain("#FFF8EE");
    expect(content).toContain("#C48A1A");
  });

  it("灵感详情页使用暖阳主题", () => {
    const detailPath = path.join(__dirname, "..", "app", "inspiration-detail.tsx");
    const content = fs.readFileSync(detailPath, "utf-8");
    expect(content).toContain("#F5A623");
    expect(content).toContain("#C48A1A");
  });

  it("分享卡片使用暖阳主题", () => {
    const detailPath = path.join(__dirname, "..", "app", "inspiration-detail.tsx");
    const content = fs.readFileSync(detailPath, "utf-8");
    // 分享卡片背景
    expect(content).toContain("#FFFCF7");
    // 分享卡片词语颜色
    expect(content).toContain("#C48A1A");
  });

  it("卷轴组件使用暖阳主题", () => {
    const rollerPath = path.join(__dirname, "..", "components", "word-roller.tsx");
    const content = fs.readFileSync(rollerPath, "utf-8");
    expect(content).toContain("#F5A623");
  });
});

describe("功能3：关于页面", () => {
  it("关于页面文件存在", () => {
    const aboutPath = path.join(__dirname, "..", "app", "(tabs)", "about.tsx");
    expect(fs.existsSync(aboutPath)).toBe(true);
  });

  it("关于页面包含APP名称'灵感'", () => {
    const aboutPath = path.join(__dirname, "..", "app", "(tabs)", "about.tsx");
    const content = fs.readFileSync(aboutPath, "utf-8");
    expect(content).toContain("灵 感");
  });

  it("关于页面包含版本号", () => {
    const aboutPath = path.join(__dirname, "..", "app", "(tabs)", "about.tsx");
    const content = fs.readFileSync(aboutPath, "utf-8");
    expect(content).toContain("Version 1.0.0");
  });

  it("关于页面包含理念标题", () => {
    const aboutPath = path.join(__dirname, "..", "app", "(tabs)", "about.tsx");
    const content = fs.readFileSync(aboutPath, "utf-8");
    expect(content).toContain("创意源于随机碰撞");
  });

  it("关于页面包含孙正义随机组合法介绍", () => {
    const aboutPath = path.join(__dirname, "..", "app", "(tabs)", "about.tsx");
    const content = fs.readFileSync(aboutPath, "utf-8");
    expect(content).toContain("孙正义");
    expect(content).toContain("随机组合法");
    expect(content).toContain("250个商业创意");
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
    expect(content).toContain("感谢每一位使用");
  });

  it("关于页面使用引用样式（左侧竖线）", () => {
    const aboutPath = path.join(__dirname, "..", "app", "(tabs)", "about.tsx");
    const content = fs.readFileSync(aboutPath, "utf-8");
    expect(content).toContain("quoteLine");
    expect(content).toContain("quoteContent");
  });

  it("底部导航栏包含关于Tab", () => {
    const layoutPath = path.join(__dirname, "..", "app", "(tabs)", "_layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain('name="about"');
    expect(content).toContain('title: "关于"');
  });

  it("icon-symbol.tsx包含info图标映射", () => {
    const iconPath = path.join(__dirname, "..", "components", "ui", "icon-symbol.tsx");
    const content = fs.readFileSync(iconPath, "utf-8");
    expect(content).toContain("info.circle.fill");
    expect(content).toContain('"info"');
  });
});
