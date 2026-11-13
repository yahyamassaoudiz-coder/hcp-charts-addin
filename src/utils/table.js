/**
 * table.js — turn a raw cell matrix (CSV or XLSX) into header + row objects (v1.2, NEW)
 * Government spreadsheets usually start with title / note rows; the header row
 * is detected as the first "wide enough" row instead of blindly using row 1.
 */

const isEmpty = (v) => v === null || v === undefined || String(v).trim() === "";
export const YEAR_RE = /^\s*(19|20)\d{2}\s*$/;

export function detectHeaderRow(matrix, scan = 30) {
  const rows = matrix.slice(0, scan);
  const width = (r) => (r || []).filter(v => !isEmpty(v)).length;
  const maxW = Math.max(0, ...rows.map(width));
  if (maxW === 0) return 0;
  const need = Math.max(2, Math.ceil(maxW * 0.6));
  const idx = rows.findIndex(r => width(r) >= need);
  return idx < 0 ? 0 : idx;
}

/**
 * @param {any[][]} matrix
 * @param {{ headerRow?: number }} options
 * @returns {{ headers: string[], rows: object[], headerRow: number }}
 */
export function tableFromMatrix(matrix, options = {}) {
  const headerRow = Number.isInteger(options.headerRow) ? options.headerRow : detectHeaderRow(matrix);
  const raw = matrix[headerRow] || [];
  const seen = {};
  const headers = [];
  const width = Math.max(raw.length, ...matrix.slice(headerRow + 1, headerRow + 50).map(r => (r || []).length));
  for (let i = 0; i < width; i++) {
    let h = isEmpty(raw[i]) ? `col_${i + 1}` : String(raw[i]).replace(/^﻿/, "").replace(/\s+/g, " ").trim();
    if (typeof raw[i] === "number" && Number.isInteger(raw[i])) h = String(raw[i]);
    if (seen[h]) h = `${h}_${++seen[h]}`; else seen[h] = 1;
    headers.push(h);
  }
  const rows = [];
  for (const r of matrix.slice(headerRow + 1)) {
    if (!r || r.every(isEmpty)) continue;
    const o = {};
    headers.forEach((h, i) => { o[h] = r[i] ?? null; });
    rows.push(o);
  }
  return { headers, rows, headerRow };
}

export default { tableFromMatrix, detectHeaderRow, YEAR_RE };
