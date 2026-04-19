/**
 * AI 智能分析服务
 * 调用 OpenAI 兼容的 Chat Completions API
 * 支持 OpenAI (GPT) 和 通义千问 (Qwen)
 */

import { getAIConfig, AI_PLATFORMS, type AIConfig } from "./aiConfig";

/** 构建分析 Prompt */
function buildAnalysisPrompt(word1: string, word2: string, word3: string, idea: string): string {
  return `你是一位创意顾问。用户通过随机组合三个词来激发灵感，以下是他们的创作记录：

【三个随机词】：${word1}、${word2}、${word3}
【用户的灵感点子】：${idea}

请你：
1. 用2-3句话点评这个创意的独特之处和潜在价值
2. 给出一个创意评分（1-10分），并简要说明评分理由
3. 提供一个延伸思考方向，帮助用户进一步深化这个创意

请用简洁、鼓励性的语气回答，总字数控制在200字以内。`;
}

/** 调用 LLM API */
async function callLLM(config: AIConfig, prompt: string): Promise<string> {
  const platformInfo = AI_PLATFORMS[config.platform];

  const response = await fetch(platformInfo.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: platformInfo.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    if (response.status === 401) {
      throw new Error("API Key 无效，请在设置中重新配置。");
    }
    if (response.status === 429) {
      throw new Error("API 调用频率超限或额度不足，请稍后重试。");
    }
    if (response.status === 403) {
      throw new Error("API Key 权限不足，请检查配置。");
    }
    throw new Error(data?.error?.message || `API 调用失败 (${response.status})`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI 返回了空的分析结果，请重试。");
  }
  return content.trim();
}

/**
 * AI 分析灵感内容
 * @returns AI 的分析文本
 * @throws Error 如果未配置 API Key 或调用失败
 */
export async function analyzeInspiration(
  words: string[],
  idea: string
): Promise<string> {
  const config = await getAIConfig();
  if (!config) {
    throw new Error("NO_API_KEY");
  }

  const prompt = buildAnalysisPrompt(words[0], words[1], words[2], idea);
  return await callLLM(config, prompt);
}

/**
 * 获取创意评分 (从分析结果中提取)
 */
export async function getCreativityScore(
  words: string[],
  idea: string
): Promise<number> {
  return -1; // 评分从分析结果中提取，不单独调用
}

/**
 * 获取相似灵感推荐 (未来实现)
 */
export async function getSimilarInspirations(
  idea: string
): Promise<Array<{ id: number; similarity: number; preview: string }>> {
  return [];
}

/**
 * AI 服务是否可用（检查是否配置了 API Key）
 */
export async function isAIServiceAvailable(): Promise<boolean> {
  const config = await getAIConfig();
  return !!config?.apiKey;
}
