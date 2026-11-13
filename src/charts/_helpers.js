/**
 * _helpers.js — shared drawing helpers for shape-built advanced charts (v1.2)
 * Everything uses theme references (accentN / tx1 / bg1) so charts recolour
 * with the destination presentation, and the slide's PptxGenJS instance for
 * shape enums (the class itself has no static enums).
 */

export const ACCENTS = ["accent1", "accent2", "accent3", "accent4", "accent5", "accent6"];
export const accent = (i) => ACCENTS[((i % 6) + 6) % 6];
export const TEXT = "tx1";
export const MUTED = "7F7F7F";   // -> tx1 tint via ThemeAdapter
export const FAINT = "D9D9D9";   // -> tx1 light tint via ThemeAdapter
export const POSITIVE = "accent6";
export const NEGATIVE = "accent2";

export function fmt(v, digits = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  const abs = Math.abs(v);
  if (abs >= 1e9) return (v / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Md";
  if (abs >= 1e6) return (v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " M";
  if (abs >= 1e4) return (v / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " k";
  return v.toLocaleString("fr-FR", { maximumFractionDigits: digits });
}

export function signed(v, digits = 1) {
  if (v === null || v === undefined) return "";
  return (v > 0 ? "+" : "") + fmt(v, digits);
}

export function text(slide, str, x, y, w, h, opts = {}) {
  slide.addText(String(str ?? ""), {
    x, y, w, h, fontFace: "+mn-lt", fontSize: 10, color: TEXT,
    margin: 0, valign: "middle", ...opts
  });
}

export function rect(slide, pptx, x, y, w, h, fill, opts = {}) {
  if (w <= 0 || h <= 0) return;
  slide.addShape(pptx.shapes.RECTANGLE, {
    x, y, w, h, fill: { color: fill }, line: { type: "none" }, ...opts
  });
}

export function dot(slide, pptx, cx, cy, r, fill, opts = {}) {
  slide.addShape(pptx.shapes.OVAL, {
    x: cx - r, y: cy - r, w: r * 2, h: r * 2,
    fill: { color: fill }, line: { color: "FFFFFF", width: 1 }, ...opts
  });
}

/**
 * Straight line between two points. PowerPoint lines run top-left to
 * bottom-right of their box, so rising lines need flipV (v1.1 passed a
 * negative height instead, which renders wrongly).
 */
export function line(slide, pptx, x1, y1, x2, y2, color = FAINT, width = 1, extra = {}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  slide.addShape(pptx.shapes.LINE, {
    x: Math.min(x1, x2), y: Math.min(y1, y2),
    w: Math.max(Math.abs(dx), 0.0001), h: Math.max(Math.abs(dy), 0.0001),
    flipV: (dx >= 0) !== (dy >= 0) && dx !== 0 && dy !== 0,
    line: { color, width, ...extra }
  });
}

/** Valid (non-null) values of a series. */
export const valid = (arr) => arr.filter(v => v !== null && v !== undefined && !Number.isNaN(v));

/** Last non-null value and its index. */
export function lastValid(arr) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null && arr[i] !== undefined) return { value: arr[i], index: i };
  }
  return { value: null, index: -1 };
}

/** "Nice" axis bounds that include 0. */
export function niceRange(values, includeZero = true) {
  const v = valid(values);
  let min = Math.min(...v, includeZero ? 0 : Infinity);
  let max = Math.max(...v, includeZero ? 0 : -Infinity);
  if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 1 };
  if (min === max) { max = min + 1; }
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span)));
  const nice = [1, 2, 2.5, 5, 10].map(m => m * step).find(s => span / s <= 6) || step * 10;
  return { min: Math.floor(min / nice) * nice, max: Math.ceil(max / nice) * nice, step: nice };
}

export function requireSeries(series, n, chartLabel) {
  if (series.length < n) {
    throw new Error(`« ${chartLabel} » nécessite au moins ${n} indicateur(s).`);
  }
}
