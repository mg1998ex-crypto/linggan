/**
 * 同源词过滤算法
 * 检测三个词的语义相似度,确保组合具有足够的"跨度"
 */

/**
 * 计算两个字符串的编辑距离(Levenshtein Distance)
 * 用于检测词语的相似度
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

/**
 * 计算两个词的相似度(0-1之间,1表示完全相同)
 */
function calculateSimilarity(word1: string, word2: string): number {
  const distance = levenshteinDistance(word1, word2);
  const maxLength = Math.max(word1.length, word2.length);
  return 1 - distance / maxLength;
}

/**
 * 检查两个词是否包含相同的字符(用于检测同源词)
 */
function hasCommonCharacters(word1: string, word2: string): boolean {
  const chars1 = new Set(word1.split(""));
  const chars2 = new Set(word2.split(""));
  let commonCount = 0;

  for (const char of chars1) {
    if (chars2.has(char)) {
      commonCount++;
    }
  }

  // 如果超过50%的字符相同,认为是同源词
  const minLength = Math.min(word1.length, word2.length);
  return commonCount / minLength > 0.5;
}

/**
 * 检查词语是否包含另一个词(如"苹果"和"红苹果")
 */
function isSubstring(word1: string, word2: string): boolean {
  return word1.includes(word2) || word2.includes(word1);
}

/**
 * 检查三个词是否为同源词
 * @returns true 表示通过检测(不是同源词), false 表示是同源词需要重新抽取
 */
export function checkWordDiversity(word1: string, word2: string, word3: string): boolean {
  const pairs = [
    [word1, word2],
    [word1, word3],
    [word2, word3],
  ];

  for (const [w1, w2] of pairs) {
    // 检查1: 是否包含关系(如"苹果"和"红苹果")
    if (isSubstring(w1, w2)) {
      return false;
    }

    // 检查2: 编辑距离相似度是否过高(阈值0.7)
    const similarity = calculateSimilarity(w1, w2);
    if (similarity > 0.7) {
      return false;
    }

    // 检查3: 是否有过多相同字符
    if (hasCommonCharacters(w1, w2)) {
      return false;
    }
  }

  return true;
}

/**
 * 从词库中随机抽取三个词,确保它们不是同源词
 * @param words 词库数组
 * @param maxAttempts 最大尝试次数
 * @returns 三个不同的词
 */
export function getRandomWords(words: string[], maxAttempts: number = 50): [string, string, string] {
  if (words.length < 3) {
    throw new Error("词库至少需要3个词");
  }

  let attempts = 0;
  while (attempts < maxAttempts) {
    // 随机抽取三个不同的词
    const indices = new Set<number>();
    while (indices.size < 3) {
      indices.add(Math.floor(Math.random() * words.length));
    }

    const [idx1, idx2, idx3] = Array.from(indices);
    const word1 = words[idx1];
    const word2 = words[idx2];
    const word3 = words[idx3];

    // 检查是否为同源词
    if (checkWordDiversity(word1, word2, word3)) {
      return [word1, word2, word3];
    }

    attempts++;
  }

  // 如果超过最大尝试次数,直接返回三个随机词(降级策略)
  const indices = new Set<number>();
  while (indices.size < 3) {
    indices.add(Math.floor(Math.random() * words.length));
  }
  const [idx1, idx2, idx3] = Array.from(indices);
  return [words[idx1], words[idx2], words[idx3]];
}
