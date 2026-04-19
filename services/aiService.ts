/**
 * AI 智能分析服务模块（预留架构）
 *
 * 本模块定义了未来接入 AI 分析功能的接口。
 * 当前所有函数返回占位值，待后续接入 AI 服务后实现具体逻辑。
 *
 * 预计接入方式：调用服务端内置 LLM 能力（见 server/README.md）
 */

/**
 * AI 分析灵感内容
 * 未来用于发送灵感的三个词和用户创意给 AI，获取深度分析结果
 *
 * @param words - 三个随机组合的词语
 * @param idea - 用户基于三个词写下的灵感/创意
 * @returns AI 的分析文本（如创意解读、联想拓展、可行性评估等）
 */
export async function analyzeInspiration(
  words: string[],
  idea: string
): Promise<string> {
  // TODO: 接入 AI 服务后实现
  // 预计调用: POST /api/trpc/ai.analyze
  // 请求体: { words, idea }
  // 响应: { analysis: string }
  return "功能即将推出 — AI 将为你的灵感提供深度分析和创意拓展建议。";
}

/**
 * 获取创意评分
 * 未来用于评估用户灵感的创意程度（基于词语关联度、创意新颖性等维度）
 *
 * @param words - 三个随机组合的词语
 * @param idea - 用户的灵感内容
 * @returns 0-100 的创意评分
 */
export async function getCreativityScore(
  words: string[],
  idea: string
): Promise<number> {
  // TODO: 接入 AI 服务后实现
  // 预计评分维度：
  // - 词语关联创新度（三个词之间的语义距离越远，组合越有创意）
  // - 内容丰富度（灵感描述的详细程度和想象力）
  // - 可行性（创意的实际可执行性）
  return -1; // -1 表示功能未启用
}

/**
 * 获取相似灵感推荐
 * 未来用于基于当前灵感内容，推荐用户历史中语义相似的灵感记录
 *
 * @param idea - 当前灵感内容
 * @returns 相似灵感的 ID 列表和相似度分数
 */
export async function getSimilarInspirations(
  idea: string
): Promise<Array<{ id: number; similarity: number; preview: string }>> {
  // TODO: 接入 AI 服务后实现
  // 预计使用向量嵌入（embedding）计算语义相似度
  // 需要在数据库中存储灵感的向量表示
  return [];
}

/**
 * AI 服务是否可用
 * 用于 UI 层判断是否显示 AI 相关功能
 */
export function isAIServiceAvailable(): boolean {
  // 当前 AI 服务未接入，返回 false
  return false;
}
