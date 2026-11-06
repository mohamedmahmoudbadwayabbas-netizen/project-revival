/**
 * Arabic Text Normalization & Fuzzy Search Engine
 * Handles typo tolerance, diacritics stripping, letter normalization, and string distance algorithms.
 */

export function normalizeArabic(text: string): string {
  if (!text) return "";
  return (
    text
      // Strip Arabic diacritics (tashkeel)
      .replace(/[\u064B-\u0652]/g, "")
      // Normalize Alef forms: أ, إ, آ, ٱ -> ا
      .replace(/[أإآٱ]/g, "ا")
      // Normalize Teh Marbuta: ة -> ه
      .replace(/ة/g, "ه")
      // Normalize Alef Maksura: ى -> ي
      .replace(/ى/g, "ي")
      // Normalize Waw with Hamza / Yeh with Hamza
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      // Trim and collapse spaces
      .toLowerCase()
      .trim()
  );
}

/**
 * Calculates Levenshtein Distance between two strings for typo tolerance.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks if a query fuzzy-matches a target text.
 * Returns a score between 0 (no match) and 1 (exact/perfect match).
 */
export function getFuzzyMatchScore(query: string, targetText: string): number {
  const normQuery = normalizeArabic(query);
  const normTarget = normalizeArabic(targetText);

  if (!normQuery || !normTarget) return 0;

  // Exact or substring match gets highest score
  if (normTarget === normQuery) return 1.0;
  if (normTarget.includes(normQuery)) return 0.9;
  if (normQuery.includes(normTarget)) return 0.85;

  // Split target words and check token-level match
  const targetWords = normTarget.split(/\s+/);
  const queryWords = normQuery.split(/\s+/);

  let maxTokenScore = 0;

  for (const qWord of queryWords) {
    if (qWord.length < 2) continue;

    for (const tWord of targetWords) {
      if (tWord.includes(qWord)) {
        maxTokenScore = Math.max(maxTokenScore, 0.8);
        continue;
      }

      // Check distance for typo handling e.g. "طمطم" vs "طماطم"
      const dist = levenshteinDistance(qWord, tWord);
      const maxLen = Math.max(qWord.length, tWord.length);
      const similarity = 1 - dist / maxLen;

      if (dist <= 2 || similarity >= 0.6) {
        maxTokenScore = Math.max(maxTokenScore, similarity);
      }
    }
  }

  return maxTokenScore;
}

export function searchProductsFuzzy<T extends { name: string; description?: string | null }>(
  products: T[],
  query: string,
  minThreshold: number = 0.45,
): T[] {
  if (!query.trim()) return products;

  const scored = products.map((product) => {
    const nameScore = getFuzzyMatchScore(query, product.name);
    const descScore = product.description
      ? getFuzzyMatchScore(query, product.description) * 0.7
      : 0;
    const finalScore = Math.max(nameScore, descScore);
    return { product, score: finalScore };
  });

  return scored
    .filter((item) => item.score >= minThreshold)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);
}
