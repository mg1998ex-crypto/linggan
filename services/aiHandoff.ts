import { Platform, Share } from "react-native";

export function buildAIAnalysisPrompt(words: string[], idea: string): string {
  const [word1 = "", word2 = "", word3 = ""] = words;
  return `你是一位兼具创造力、产品思维和商业判断力的创意顾问。请分析下面这个由“三词随机组合法”产生的灵感。\n\n【随机词】\n${word1} × ${word2} × ${word3}\n\n【我的想法】\n${idea}\n\n请按以下结构回答：\n1. 核心创意：用一句话准确概括\n2. 独特价值：它新在哪里，解决了什么问题\n3. 可行性：实现所需的关键条件与最大障碍\n4. 商业可能：目标用户、使用场景和可能的收费方式\n5. 风险提醒：最值得提前验证的三个假设\n6. 下一步：给出一个今天就能开始的最小验证行动\n\n请具体、诚实、可执行，不要只给泛泛的鼓励。`;
}

export async function sendPromptToAI(prompt: string): Promise<"shared" | "copied"> {
  if (Platform.OS !== "web") {
    await Share.share({ title: "分析这条灵感", message: prompt });
    return "shared";
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ title: "分析这条灵感", text: prompt });
    return "shared";
  }
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(prompt);
    return "copied";
  }
  throw new Error("当前浏览器不支持分享或复制");
}
