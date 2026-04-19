/**
 * 第十轮功能测试
 * 测试主题颜色系统、反馈存储、数据库schema
 * 注意: aiService 和 aiConfig 依赖 react-native Platform，在 vitest 中无法直接导入
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// 1. 文件存在性测试 - 验证所有新文件已创建
describe("Round 10 Files", () => {
  const projectRoot = path.resolve(__dirname, "..");

  it("should have AI service file", () => {
    expect(fs.existsSync(path.join(projectRoot, "services/aiService.ts"))).toBe(true);
  });

  it("should have AI config file", () => {
    expect(fs.existsSync(path.join(projectRoot, "services/aiConfig.ts"))).toBe(true);
  });

  it("should have feedback storage file", () => {
    expect(fs.existsSync(path.join(projectRoot, "services/feedbackStorage.ts"))).toBe(true);
  });

  it("should have theme context file", () => {
    expect(fs.existsSync(path.join(projectRoot, "lib/theme-context.tsx"))).toBe(true);
  });

  it("should have theme colors hook", () => {
    expect(fs.existsSync(path.join(projectRoot, "hooks/use-theme-colors.ts"))).toBe(true);
  });

  it("should have settings page", () => {
    expect(fs.existsSync(path.join(projectRoot, "app/settings.tsx"))).toBe(true);
  });

  it("should have feedback page", () => {
    expect(fs.existsSync(path.join(projectRoot, "app/feedback.tsx"))).toBe(true);
  });

  it("should have feedback history page", () => {
    expect(fs.existsSync(path.join(projectRoot, "app/feedback-history.tsx"))).toBe(true);
  });
});

// 2. AI Service 内容验证
describe("AI Service Content", () => {
  const content = fs.readFileSync(path.resolve(__dirname, "../services/aiService.ts"), "utf-8");

  it("should export analyzeInspiration function", () => {
    expect(content).toContain("export async function analyzeInspiration");
  });

  it("should export getCreativityScore function", () => {
    expect(content).toContain("export async function getCreativityScore");
  });

  it("should export getSimilarInspirations function", () => {
    expect(content).toContain("export async function getSimilarInspirations");
  });

  it("should import from aiConfig", () => {
    expect(content).toContain("from \"./aiConfig\"");
  });
});

// 3. AI Config 内容验证
describe("AI Config Content", () => {
  const content = fs.readFileSync(path.resolve(__dirname, "../services/aiConfig.ts"), "utf-8");

  it("should define OpenAI platform", () => {
    expect(content).toContain("openai");
    expect(content).toContain("gpt-4o-mini");
  });

  it("should define Qwen platform", () => {
    expect(content).toContain("qwen");
    expect(content).toContain("qwen-turbo");
  });

  it("should export saveAIConfig function", () => {
    expect(content).toContain("export async function saveAIConfig");
  });

  it("should export getAIConfig function", () => {
    expect(content).toContain("export async function getAIConfig");
  });

  it("should export clearAIConfig function", () => {
    expect(content).toContain("export async function clearAIConfig");
  });

  it("should export testConnection function", () => {
    expect(content).toContain("export async function testConnection");
  });

  it("should use SecureStore for native", () => {
    expect(content).toContain("expo-secure-store");
  });
});

// 4. Theme Colors 内容验证
describe("Theme Colors Content", () => {
  const content = fs.readFileSync(path.resolve(__dirname, "../hooks/use-theme-colors.ts"), "utf-8");

  it("should define light colors", () => {
    expect(content).toContain("lightColors");
    expect(content).toContain("isDark: false");
  });

  it("should define dark colors", () => {
    expect(content).toContain("darkColors");
    expect(content).toContain("isDark: true");
  });

  it("should have warm amber primary color", () => {
    expect(content).toContain("#F5A623");
  });

  it("should have dark mode background", () => {
    expect(content).toContain("#1C1C1E");
  });

  it("should export getThemeColors function", () => {
    expect(content).toContain("export function getThemeColors");
  });

  it("should export useThemeColors hook", () => {
    expect(content).toContain("export function useThemeColors");
  });

  it("should have all essential color tokens", () => {
    const requiredTokens = [
      "primary", "background", "surface", "foreground", "muted", "border",
      "cardBg", "inputBg", "accentLight", "accentDark", "overlayBg", "navbarBg",
    ];
    for (const token of requiredTokens) {
      expect(content).toContain(token);
    }
  });
});

// 5. Theme Context 内容验证
describe("Theme Context Content", () => {
  const content = fs.readFileSync(path.resolve(__dirname, "../lib/theme-context.tsx"), "utf-8");

  it("should support system/light/dark modes", () => {
    expect(content).toContain("\"system\"");
    expect(content).toContain("\"light\"");
    expect(content).toContain("\"dark\"");
  });

  it("should use AsyncStorage for persistence", () => {
    expect(content).toContain("AsyncStorage");
  });

  it("should export ThemeManagerProvider", () => {
    expect(content).toContain("export function ThemeManagerProvider");
  });

  it("should export useThemeManager hook", () => {
    expect(content).toContain("export function useThemeManager");
  });
});

// 6. Feedback Storage 内容验证
describe("Feedback Storage Content", () => {
  const content = fs.readFileSync(path.resolve(__dirname, "../services/feedbackStorage.ts"), "utf-8");

  it("should define FeedbackType", () => {
    expect(content).toContain("FeedbackType");
    expect(content).toContain("bug");
    expect(content).toContain("feature");
    expect(content).toContain("other");
  });

  it("should export saveFeedbackRecord", () => {
    expect(content).toContain("export async function saveFeedbackRecord");
  });

  it("should export getFeedbackRecords", () => {
    expect(content).toContain("export async function getFeedbackRecords");
  });

  it("should export formatFeedbackText", () => {
    expect(content).toContain("export function formatFeedbackText");
  });

  it("should format feedback with correct template", () => {
    expect(content).toContain("【灵感APP意见反馈】");
    expect(content).toContain("APP版本：1.0.0");
  });
});

// 7. Database Schema AI Fields
describe("Database Schema AI Fields", () => {
  it("should have aiAnalysis and aiAnalyzedAt columns in inspirations table", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.inspirations;
    expect(table).toBeDefined();
    expect(table.aiAnalysis).toBeDefined();
    expect(table.aiAnalyzedAt).toBeDefined();
  });
});

// 8. Settings Page 内容验证
describe("Settings Page Content", () => {
  const content = fs.readFileSync(path.resolve(__dirname, "../app/settings.tsx"), "utf-8");

  it("should have AI settings section", () => {
    expect(content).toContain("AI");
  });

  it("should have appearance mode section", () => {
    expect(content).toContain("外观");
  });

  it("should use useThemeColors", () => {
    expect(content).toContain("useThemeColors");
  });

  it("should use useThemeManager", () => {
    expect(content).toContain("useThemeManager");
  });
});

// 9. Feedback Page 内容验证
describe("Feedback Page Content", () => {
  const content = fs.readFileSync(path.resolve(__dirname, "../app/feedback.tsx"), "utf-8");

  it("should have QQ integration", () => {
    expect(content).toContain("2522507815");
    expect(content).toContain("mqqwpa://");
  });

  it("should have clipboard copy", () => {
    expect(content).toContain("clipboard");
  });

  it("should use useThemeColors", () => {
    expect(content).toContain("useThemeColors");
  });
});

// 10. Dark mode applied to all pages
describe("Dark Mode Applied", () => {
  const pages = [
    "app/(tabs)/index.tsx",
    "app/(tabs)/archive.tsx",
    "app/(tabs)/library.tsx",
    "app/(tabs)/about.tsx",
    "app/(tabs)/_layout.tsx",
    "app/category-detail.tsx",
    "app/inspiration-detail.tsx",
  ];

  for (const page of pages) {
    it(`${page} should use useThemeColors`, () => {
      const content = fs.readFileSync(path.resolve(__dirname, "..", page), "utf-8");
      expect(content).toContain("useThemeColors");
    });
  }
});
