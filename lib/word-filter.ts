/**
 * 同源词过滤算法
 * 检测三个词的语义相似度,确保组合具有足够的"跨度"和创意激发价值
 */

/**
 * 检查词语是否包含另一个词(如"苹果"和"红苹果")
 */
function isSubstring(word1: string, word2: string): boolean {
  return word1.includes(word2) || word2.includes(word1);
}

/**
 * 提取核心词(最后2个字)
 * 对于3字及以上的词,取最后2个字作为核心词
 * 例如:"牛仔帽" → "仔帽", "宠物帽子" → "帽子", "台球桌" → "球桌"
 */
function extractCoreWord(word: string): string {
  if (word.length <= 2) return word;
  return word.slice(-2);
}

/**
 * 检查两个词是否共享相同的核心词
 * 例如:"牛仔帽"和"宠物帽子"都含"帽"
 */
function hasSameCoreWord(word1: string, word2: string): boolean {
  // 对于短词(<=2字),直接比较
  if (word1.length <= 2 && word2.length <= 2) {
    return word1 === word2;
  }

  const core1 = extractCoreWord(word1);
  const core2 = extractCoreWord(word2);

  // 核心词完全相同
  if (core1 === core2) return true;

  // 核心词有包含关系(如"帽"和"帽子")
  if (core1.includes(core2) || core2.includes(core1)) return true;

  // 检查最后一个字是否相同(如"牛仔帽"和"安全帽"最后都是"帽")
  if (word1.length >= 2 && word2.length >= 2) {
    const lastChar1 = word1[word1.length - 1];
    const lastChar2 = word2[word2.length - 1];
    // 常见的核心尾字匹配
    const coreChars = new Set(["帽", "鞋", "衣", "裤", "包", "杯", "碗", "盘", "锅", "刀", "笔", "灯", "车", "机", "球", "琴", "花", "草", "树", "鱼", "鸟", "桌", "椅", "床", "柜"]);
    if (lastChar1 === lastChar2 && coreChars.has(lastChar1)) {
      return true;
    }
  }

  return false;
}

/**
 * 检查三个词是否为同源词
 * @returns true 表示通过检测(不是同源词), false 表示是同源词需要重新抽取
 */
export function checkWordDiversity(word1: string, word2: string, word3: string): boolean {
  const pairs: [string, string][] = [
    [word1, word2],
    [word1, word3],
    [word2, word3],
  ];

  for (const [w1, w2] of pairs) {
    // 检查1: 完全包含过滤(如"苹果"和"红苹果")
    if (isSubstring(w1, w2)) {
      return false;
    }

    // 检查2: 相同核心词过滤(如"牛仔帽"和"宠物帽子")
    if (hasSameCoreWord(w1, w2)) {
      return false;
    }
  }

  return true;
}

/**
 * 检查三个词是否全部来自同一分类
 * @param categoryMap 词语到分类ID的映射
 * @returns true 表示全部同分类(需要重抽)
 */
export function areAllSameCategory(
  words: [string, string, string],
  categoryMap: Map<string, string>
): boolean {
  const cat1 = categoryMap.get(words[0]);
  const cat2 = categoryMap.get(words[1]);
  const cat3 = categoryMap.get(words[2]);

  // 如果有词找不到分类,不过滤
  if (!cat1 || !cat2 || !cat3) return false;

  return cat1 === cat2 && cat2 === cat3;
}

/**
 * 从词库中随机抽取三个词,确保它们不是同源词
 * @param words 词库数组
 * @param maxAttempts 最大尝试次数
 * @param categoryMap 词语到分类ID的映射(可选,用于同分类过滤)
 * @param isFilteredByCategory 是否用户主动选择了分类(如果是,跳过同分类过滤)
 * @returns 三个不同的词
 */
export function getRandomWords(
  words: string[],
  maxAttempts: number = 10,
  categoryMap?: Map<string, string>,
  isFilteredByCategory?: boolean,
): [string, string, string] {
  if (words.length < 3) {
    throw new Error("词库至少需要3个词");
  }

  let lastResult: [string, string, string] | null = null;
  let attempts = 0;

  while (attempts < maxAttempts) {
    // 随机抽取三个不同的词
    const indices = new Set<number>();
    while (indices.size < 3) {
      indices.add(Math.floor(Math.random() * words.length));
    }

    const [idx1, idx2, idx3] = Array.from(indices);
    const result: [string, string, string] = [words[idx1], words[idx2], words[idx3]];
    lastResult = result;

    // 检查同源词
    if (!checkWordDiversity(result[0], result[1], result[2])) {
      attempts++;
      continue;
    }

    // 检查同分类(仅在非用户主动选择分类时)
    if (categoryMap && !isFilteredByCategory && areAllSameCategory(result, categoryMap)) {
      attempts++;
      continue;
    }

    return result;
  }

  // 超过最大尝试次数,使用最后一次结果
  return lastResult!;
}

/**
 * 从词库中随机抽取指定数量的词(不重复)
 * 用于锁定词语后只抽取部分词
 */
export function getRandomWord(
  words: string[],
  excludeWords: string[] = [],
): string {
  const available = words.filter((w) => !excludeWords.includes(w));
  if (available.length === 0) {
    return words[Math.floor(Math.random() * words.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * 抽取部分词语(用于锁定词语后的部分重抽)
 * @param words 词库数组
 * @param lockedWords 已锁定的词(保持不变)
 * @param lockedIndices 锁定的位置索引 [0,1,2]
 * @param maxAttempts 最大尝试次数
 * @param categoryMap 词语到分类ID的映射
 * @param isFilteredByCategory 是否用户主动选择了分类
 */
export function getPartialRandomWords(
  words: string[],
  currentWords: [string, string, string],
  lockedIndices: boolean[],
  maxAttempts: number = 10,
  categoryMap?: Map<string, string>,
  isFilteredByCategory?: boolean,
): [string, string, string] {
  const unlockedCount = lockedIndices.filter((locked) => !locked).length;
  if (unlockedCount === 0) return currentWords;
  if (unlockedCount === 3) return getRandomWords(words, maxAttempts, categoryMap, isFilteredByCategory);

  let attempts = 0;
  let lastResult: [string, string, string] = [...currentWords];

  while (attempts < maxAttempts) {
    const result: [string, string, string] = [...currentWords];
    const usedWords = currentWords.filter((_, i) => lockedIndices[i]);

    // 为未锁定的位置抽取新词
    for (let i = 0; i < 3; i++) {
      if (!lockedIndices[i]) {
        result[i] = getRandomWord(words, usedWords);
        usedWords.push(result[i]);
      }
    }

    lastResult = result;

    // 检查同源词
    if (!checkWordDiversity(result[0], result[1], result[2])) {
      attempts++;
      continue;
    }

    // 检查同分类
    if (categoryMap && !isFilteredByCategory && areAllSameCategory(result, categoryMap)) {
      attempts++;
      continue;
    }

    return result;
  }

  return lastResult;
}
