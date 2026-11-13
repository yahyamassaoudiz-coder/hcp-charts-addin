/**
 * csvParser.js — Robust CSV Parser Wrapper
 * ==========================================
 * Wraps PapaParse with additional preprocessing for
 * Moroccan government data quirks:
 *   - BOM removal (UTF-8 BOM)
 *   - Auto-delimiter detection (comma, semicolon, tab)
 *   - French decimal handling
 *   - Encoding normalization
 *   - Empty row removal
 *   - Header cleaning
 */

import Papa from "papaparse";

/**
 * Clean raw CSV text before parsing.
 * @param {string} rawText
 * @returns {string}
 */
function preprocess(rawText) {
  let text = rawText;
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.substring(1);
  }
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text.replace(/\n+$/, "");
  return text;
}

/**
 * Clean header names after parsing.
 * @param {string} header
 * @returns {string}
 */
function cleanHeader(header) {
  return header
    .replace(/^\uFEFF/, "")
    .replace(/^["']+|["']+$/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
}

/**
 * Parse CSV text into an array of objects.
 * @param {string} csvText
 * @param {object} options
 * @returns {Promise<object>}
 */
export function parseCSV(csvText, options = {}) {
  const {
    cleanHeaders = false,
    frenchDecimals = false,
    delimiter = null
  } = options;

  return new Promise((resolve, reject) => {
    const cleaned = preprocess(csvText);

    // Detect if semicolon-delimited (common in French CSVs)
    const firstLine = cleaned.split("\n")[0] || "";
    const hasSemicolons = (firstLine.match(/;/g) || []).length > 2;
    const hasCommas = (firstLine.match(/,/g) || []).length > 2;
    const effectiveDelimiter = delimiter ||
      (hasSemicolons && !hasCommas ? ";" : undefined);

    const config = {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: !frenchDecimals,
      trimHeaders: true,
      delimiter: effectiveDelimiter,
      delimitersToGuess: [",", ";", "\t", "|"],
      transformHeader: cleanHeaders ? cleanHeader : (h) => h.trim(),

      complete: (results) => {
        let data = results.data;

        // Handle French decimals if needed
        if (frenchDecimals) {
          data = data.map(row => {
            const newRow = {};
            for (const [key, value] of Object.entries(row)) {
              if (typeof value === "string") {
                const frenchNum = value
                  .replace(/\s/g, "")
                  .replace(/\./g, "")
                  .replace(",", ".");
                const num = parseFloat(frenchNum);
                newRow[key] = !isNaN(num) && isFinite(num) ? num : value.trim();
              } else {
                newRow[key] = value;
              }
            }
            return newRow;
          });
        }

        // Remove completely empty rows
        data = data.filter(row =>
          Object.values(row).some(v =>
            v !== null && v !== undefined && String(v).trim() !== ""
          )
        );

        resolve({
          data: data,
          headers: results.meta.fields || [],
          delimiter: results.meta.delimiter,
          errors: results.errors.slice(0, 10),
          rowCount: data.length,
          truncated: results.meta.truncated || false
        });
      },

      error: (error) => {
        reject(new Error("CSV parse error: " + error.message));
      }
    };

    Papa.parse(cleaned, config);
  });
}

/**
 * Parse a CSV file from a URL.
 * @param {string} url
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function parseCSVFromUrl(url, options = {}) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch CSV: " + response.status + " " + response.statusText);
  }
  const text = await response.text();
  return parseCSV(text, options);
}

/**
 * Detect the structure of a CSV (columns, types, sample values).
 * @param {string} csvText
 * @returns {Promise<object>}
 */
export async function inspectCSV(csvText) {
  const result = await parseCSV(csvText, { cleanHeaders: false });

  const columns = result.headers.map(header => {
    const values = result.data
      .map(row => row[header])
      .filter(v => v !== null && v !== undefined && String(v).trim() !== "");

    const sampleValues = values.slice(0, 5);
    const numericCount = values.filter(v =>
      typeof v === "number" || !isNaN(parseFloat(v))
    ).length;
    const isNumeric = numericCount > values.length * 0.8;

    const yearPattern = values.filter(v => /^\d{4}$/.test(String(v))).length;
    const isYear = yearPattern > values.length * 0.8;

    return {
      name: header,
      type: isYear ? "year" : (isNumeric ? "numeric" : "text"),
      sampleValues: sampleValues,
      uniqueCount: new Set(values.map(String)).size,
      nullCount: result.data.length - values.length,
      isYear,
      isNumeric
    };
  });

  return {
    headers: result.headers,
    columns: columns,
    rowCount: result.rowCount,
    delimiter: result.delimiter
  };
}

const CSVParser = { parseCSV, parseCSVFromUrl, inspectCSV };
export default CSVParser;
