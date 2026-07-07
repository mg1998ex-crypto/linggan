import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Android release UI regressions", () => {
  it("uses native flex styles for the root screen container", () => {
    const source = read("components/screen-container.tsx");
    expect(source).toContain("outer: { flex: 1 }");
    expect(source).toContain("safeArea: { flex: 1 }");
    expect(source).toContain("content: { flex: 1 }");
    expect(source).not.toContain('className={cn("flex-1"');
  });

  it("always renders a visible primary start action", () => {
    const source = read("app/(tabs)/index.tsx");
    expect(source).toContain("开始 · 生成三个词");
    expect(source).toContain('backgroundColor: c.primary');
    expect(source).toContain('color: "#FFFFFF"');
  });

  it("keeps library and archive user-facing fallback states", () => {
    expect(read("app/(tabs)/library.tsx")).toContain("加载词库中...");
    const archive = read("app/(tabs)/archive.tsx");
    expect(archive).toContain("还没有保存任何灵感");
    expect(archive).toContain('statsHeader: { width: "100%" }');
  });

  it("does not enable the experimental React compiler for the release", () => {
    expect(read("app.config.ts")).not.toContain("reactCompiler: true");
  });
});
