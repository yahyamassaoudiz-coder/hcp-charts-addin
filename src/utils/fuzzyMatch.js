/**
 * fuzzyMatch.js — Fuzzy String Matching Utilities
 * =================================================
 * Lightweight fuzzy matching for region names, city names,
 * and indicator labels. Uses Levenshtein distance + normalization.
 */

/**
 * Calculate the Levenshtein distance between two strings.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshtein(a, b) {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: an + 1 }, (_, i) =>
    Array.from({ length: bn + 1 }, (_, j) =>
      i === 0 ? j : (j === 0 ? i : 0)
    )
  );

  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[an][bn];
}

/**
 * Calculate similarity ratio (0 to 1) between two strings.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function similarity(a, b) {
  if (!a || !b) return 0;
  const strA = normalize(a);
  const strB = normalize(b);
  if (strA === strB) return 1.0;
  const maxLen = Math.max(strA.length, strB.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshtein(strA, strB);
  return 1.0 - (dist / maxLen);
}

/**
 * Normalize a string for comparison.
 * @param {string} str
 * @returns {string}
 */
export function normalize(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-–—_/\\]/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Find the best matches for a query from a list of candidates.
 * @param {string} query
 * @param {Array<string>} candidates
 * @param {object} options
 * @returns {Array<{match: string, score: number, index: number}>}
 */
export function fuzzyFind(query, candidates, options = {}) {
  const { threshold = 0.5, maxResults = 5 } = options;
  if (!query || !candidates || candidates.length === 0) return [];

  const normalizedQuery = normalize(query);

  const results = candidates
    .map((candidate, index) => {
      const normalizedCandidate = normalize(candidate);
      let score = 0;

      if (normalizedCandidate === normalizedQuery) {
        score = 1.0;
      } else if (normalizedCandidate.includes(normalizedQuery)) {
        score = 0.9 - (normalizedCandidate.length - normalizedQuery.length) * 0.01;
      } else if (normalizedQuery.includes(normalizedCandidate)) {
        score = 0.85 - (normalizedQuery.length - normalizedCandidate.length) * 0.01;
      } else if (normalizedCandidate.startsWith(normalizedQuery)) {
        score = 0.95;
      } else {
        score = similarity(query, candidate);
      }

      return { match: candidate, score, index };
    })
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return results;
}

/**
 * Find the single best match (or null if none above threshold).
 * @param {string} query
 * @param {Array<string>} candidates
 * @param {number} threshold
 * @returns {{match: string, score: number}|null}
 */
export function fuzzyFindBest(query, candidates, threshold = 0.6) {
  const results = fuzzyFind(query, candidates, { threshold, maxResults: 1 });
  return results.length > 0 ? results[0] : null;
}

/**
 * Check if two strings are "close enough" to be considered the same.
 * @param {string} a
 * @param {string} b
 * @param {number} threshold
 * @returns {boolean}
 */
export function isCloseMatch(a, b, threshold = 0.8) {
  return similarity(a, b) >= threshold;
}

/**
 * Filter a list by fuzzy search query.
 * @param {Array<object>} items
 * @param {string} query
 * @param {string} field
 * @param {number} threshold
 * @returns {Array<object>}
 */
export function fuzzyFilter(items, query, field = "label", threshold = 0.3) {
  if (!query || query.trim() === "") return items;
  const normalizedQuery = normalize(query);

  return items
    .map(item => {
      const value = item[field] || "";
      const normalizedValue = normalize(value);
      let score = 0;
      if (normalizedValue.includes(normalizedQuery)) {
        score = 0.9;
      } else if (normalizedQuery.includes(normalizedValue)) {
        score = 0.7;
      } else {
        score = similarity(value, query);
      }
      return { item, score };
    })
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map(r => r.item);
}

const FuzzyMatch = {
  levenshtein, similarity, normalize,
  fuzzyFind, fuzzyFindBest, isCloseMatch, fuzzyFilter
};
export default FuzzyMatch;
