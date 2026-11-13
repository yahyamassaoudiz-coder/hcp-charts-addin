/**
 * sanitize.js — Input Sanitization Utilities
 * =============================================
 * Prevents SQL injection, XSS, and malformed input from
 * reaching the CKAN API or being rendered in the DOM.
 */

/**
 * Sanitize a string for use in CKAN SQL queries.
 * @param {*} input
 * @returns {string}
 */
export function sanitizeSql(input) {
  if (input === null || input === undefined) return "";
  const str = String(input).trim();
  return str
    .replace(/[']/g, "''")
    .replace(/[";\\]/g, "")
    .replace(/--/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "")
    .replace(/\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|UNION|SELECT\s+INTO)\b/gi, "")
    .trim();
}

/**
 * Sanitize a value for use as a SQL parameter.
 * @param {*} value
 * @param {string} type - "string" | "number" | "integer"
 * @returns {string|number|null}
 */
export function sanitizeParam(value, type = "string") {
  if (value === null || value === undefined) return null;
  switch (type) {
    case "number":
    case "float": {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }
    case "integer":
    case "int": {
      const int = parseInt(value, 10);
      return isNaN(int) ? null : int;
    }
    case "string":
    default:
      return sanitizeSql(value);
  }
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} input
 * @returns {string}
 */
export function escapeHtml(input) {
  if (!input) return "";
  const str = String(input);
  const escapeMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&#96;"
  };
  return str.replace(/[&<>"'\/`]/g, char => escapeMap[char] || char);
}

/**
 * Strip all HTML tags from a string.
 * @param {string} input
 * @returns {string}
 */
export function stripHtml(input) {
  if (!input) return "";
  return String(input).replace(/<[^>]*>/g, "").trim();
}

/**
 * Validate and sanitize a URL. Only allows http/https.
 * @param {string} url
 * @returns {string|null}
 */
export function sanitizeUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(String(url).trim());
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch (e) {
    return null;
  }
}

/**
 * Validate a year value.
 * @param {*} year
 * @param {number} min
 * @param {number} max
 * @returns {number|null}
 */
export function validateYear(year, min = 1900, max = 2100) {
  const num = parseInt(year, 10);
  if (isNaN(num)) return null;
  if (num < min || num > max) return null;
  return num;
}

/**
 * Validate a year range.
 * @param {*} startYear
 * @param {*} endYear
 * @returns {{start: number, end: number}|null}
 */
export function validateYearRange(startYear, endYear) {
  const start = validateYear(startYear, 1960, 2030);
  const end = validateYear(endYear, 1960, 2030);
  if (start === null || end === null) return null;
  if (start > end) return null;
  return { start, end };
}

/**
 * Check if a value is non-empty after trimming.
 * @param {*} value
 * @returns {boolean}
 */
export function isNonEmpty(value) {
  return value !== null &&
         value !== undefined &&
         String(value).trim().length > 0;
}

/**
 * Truncate a string to a maximum length with ellipsis.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength = 50) {
  if (!str) return "";
  const s = String(str).trim();
  if (s.length <= maxLength) return s;
  return s.substring(0, maxLength - 3) + "...";
}

const Sanitize = {
  sanitizeSql, sanitizeParam,
  escapeHtml, stripHtml, sanitizeUrl,
  validateYear, validateYearRange,
  isNonEmpty, truncate
};
export default Sanitize;
