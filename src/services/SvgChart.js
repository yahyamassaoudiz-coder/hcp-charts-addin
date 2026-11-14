/**
 * SvgChart.js — standalone SVG rendering of a chart (web version)
 * ===============================================================
 * Used by web.html for the on-page preview and the "Télécharger SVG" file.
 *
 * Written for PowerPoint's SVG import (Insert picture → Convert to Shape):
 * presentation attributes only (no <style>, no classes, no CSS variables),
 * real <text> elements, a web-safe font, and fixed light-surface colours.
 *
 * Forms:
 *   line    — same-unit time series on ONE axis
 *   column  — clustered columns (snapshots, bar-type charts)
 *   panels  — one small line chart per series, each on its own scale; used
 *             whenever units differ (never a dual axis) or there are > 6 series
 * The .pptx stays the full-fidelity export; when the SVG form differs from the
 * selected PowerPoint chart type, `simplified` is true so the UI can say so.
 */

import { niceRange, fmt } from "../charts/_helpers.js";

// Validated categorical order (fixed, never cycled) on the light chart surface
export const SVG_PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
const SURFACE = "#ffffff", INK = "#1f2328", MUTED = "#5f6670", GRID = "#e4e7eb", AXIS = "#b4bac2";
const FONT = "Arial, Helvetica, sans-serif";
const W = 960, H = 540;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v) => Math.round(v * 100) / 100;
const has = (v) => v !== null && v !== undefined && !Number.isNaN(v);

function text(x, y, str, { size = 12, fill = INK, anchor = "start", weight = "normal", italic = false } = {}) {
  return `<text x="${n(x)}" y="${n(y)}" font-family="${FONT}" font-size="${size}" fill="${fill}" text-anchor="${anchor}"` +
    `${weight !== "normal" ? ` font-weight="${weight}"` : ""}${italic ? ' font-style="italic"' : ""}>${esc(str)}</text>`;
}
const line = (x1, y1, x2, y2, stroke, width = 1) =>
  `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${stroke}" stroke-width="${width}"/>`;

function truncate(str, max) { return str.length > max ? str.slice(0, max - 1) + "…" : str; }

/** Which SVG form fits this data and chart type. */
export function pickForm(chartConfig, series, labels) {
  const units = new Set(series.map(s => s.unit || ""));
  if (series.length > 1 && (units.size > 1 || series.length > SVG_PALETTE.length)) return "panels";
  if (chartConfig?.id === "small_multiples") return "panels";
  if (labels.length === 1) return "column";
  if (chartConfig?.group === "native" && ["bar", "pie", "doughnut"].includes(chartConfig.pptxType) && !chartConfig.isCombo) return "column";
  return "line";
}

function ticks(min, max, step) {
  const out = [];
  for (let v = min; v <= max + step / 1e6; v += step) out.push(Math.abs(v) < step / 1e6 ? 0 : v);
  return out;
}

/** Axis frame: horizontal grid, y labels, x labels. Returns scale helpers. */
function frame(box, labels, values, { includeZero, band, ySize = 11, xSize = 11 }) {
  const { min, max, step } = niceRange(values, includeZero);
  const y = (v) => box.y + box.h - ((v - min) / (max - min)) * box.h;
  const slot = band ? box.w / labels.length : (labels.length > 1 ? box.w / (labels.length - 1) : 0);
  const x = (i) => band ? box.x + (i + 0.5) * slot : (labels.length > 1 ? box.x + i * slot : box.x + box.w / 2);
  let out = "";
  for (const t of ticks(min, max, step)) {
    out += line(box.x, y(t), box.x + box.w, y(t), t === 0 && min < 0 ? AXIS : GRID, 1);
    out += text(box.x - 8, y(t) + ySize * 0.35, fmt(t), { size: ySize, fill: MUTED, anchor: "end" });
  }
  out += line(box.x, box.y + box.h, box.x + box.w, box.y + box.h, AXIS, 1);
  const every = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor(box.w / 56))));
  labels.forEach((l, i) => {
    if (i % every !== 0 && i !== labels.length - 1) return;
    if (i === labels.length - 1 && i % every !== 0 && every > 1 && (labels.length - 1) % every < every / 2) return;
    out += text(x(i), box.y + box.h + xSize + 7, l, { size: xSize, fill: MUTED, anchor: "middle" });
  });
  return { svg: out, x, y, slot, min, max };
}

function linePaths(series, color, f, { width = 2, r = 3.5, titles = true, labels = [] } = {}) {
  let out = "", d = "", pen = false;
  series.data.forEach((v, i) => {
    if (!has(v)) { pen = false; return; }
    d += `${pen ? "L" : "M"}${n(f.x(i))} ${n(f.y(v))} `;
    pen = true;
  });
  if (d) out += `<path d="${d.trim()}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
  series.data.forEach((v, i) => {
    if (!has(v)) return;
    out += `<circle cx="${n(f.x(i))}" cy="${n(f.y(v))}" r="${r}" fill="${color}" stroke="${SURFACE}" stroke-width="1.5">` +
      (titles ? `<title>${esc(series.name)} — ${esc(labels[i])} : ${esc(fmt(v))}${series.unit ? " " + esc(series.unit) : ""}</title>` : "") + `</circle>`;
  });
  return out;
}

function legend(series, x, y, maxW) {
  let out = "", cx = x, cy = y;
  series.forEach((s, i) => {
    const label = truncate(s.name, 34);
    const w = 22 + label.length * 6.6 + 18;
    if (cx + w > x + maxW && cx > x) { cx = x; cy += 20; }
    out += `<rect x="${n(cx)}" y="${n(cy - 9)}" width="12" height="12" rx="2" fill="${SVG_PALETTE[i]}"/>`;
    out += text(cx + 18, cy + 1.5, label, { size: 12, fill: INK });
    cx += w;
  });
  return { svg: out, bottom: cy + 12 };
}

function drawLine(labels, series, top) {
  let out = "";
  if (series.length > 1) { const lg = legend(series, 64, top + 8, W - 128); out += lg.svg; top = lg.bottom + 4; }
  const showEnd = series.length <= 4;
  const box = { x: 64, y: top + 12, w: W - 64 - (showEnd ? 76 : 32), h: H - 70 - (top + 12) };
  const f = frame(box, labels, series.flatMap(s => s.data), { includeZero: false, band: false });
  out += f.svg;
  series.forEach((s, i) => { out += linePaths(s, SVG_PALETTE[i], f, { labels }); });
  if (showEnd) {
    // last value of each series, nudged apart vertically
    const ends = series.map((s, i) => {
      let k = s.data.length - 1; while (k >= 0 && !has(s.data[k])) k--;
      return k < 0 ? null : { i, k, y: f.y(s.data[k]), v: s.data[k] };
    }).filter(Boolean).sort((a, b) => a.y - b.y);
    for (let j = 1; j < ends.length; j++) if (ends[j].y - ends[j - 1].y < 14) ends[j].y = ends[j - 1].y + 14;
    for (const e of ends) out += text(f.x(e.k) + 9, e.y + 4, fmt(e.v), { size: 12, fill: INK, weight: "bold" });
  }
  return out;
}

function drawColumns(labels, series, top) {
  let out = "";
  if (series.length > 1) { const lg = legend(series, 64, top + 8, W - 128); out += lg.svg; top = lg.bottom + 4; }
  const box = { x: 64, y: top + 20, w: W - 96, h: H - 70 - (top + 20) };
  const f = frame(box, labels, series.flatMap(s => s.data), { includeZero: true, band: true });
  out += f.svg;
  const group = Math.min(f.slot * 0.72, 120 * series.length);
  const gap = series.length > 1 ? 2 : 0;
  const bw = Math.max(2, Math.min(64, (group - gap * (series.length - 1)) / series.length));
  const total = bw * series.length + gap * (series.length - 1);
  const showValues = labels.length * series.length <= 14;
  const y0 = f.y(Math.max(0, f.min));
  series.forEach((s, i) => {
    s.data.forEach((v, k) => {
      if (!has(v)) return;
      const x = f.x(k) - total / 2 + i * (bw + gap);
      const yv = f.y(v), hgt = Math.abs(yv - y0), r = Math.min(4, bw / 2, hgt);
      const up = v >= 0;
      // rounded only at the data end; square on the baseline
      const d = up
        ? `M${n(x)} ${n(y0)} V${n(yv + r)} Q${n(x)} ${n(yv)} ${n(x + r)} ${n(yv)} H${n(x + bw - r)} Q${n(x + bw)} ${n(yv)} ${n(x + bw)} ${n(yv + r)} V${n(y0)} Z`
        : `M${n(x)} ${n(y0)} V${n(yv - r)} Q${n(x)} ${n(yv)} ${n(x + r)} ${n(yv)} H${n(x + bw - r)} Q${n(x + bw)} ${n(yv)} ${n(x + bw)} ${n(yv - r)} V${n(y0)} Z`;
      out += `<path d="${d}" fill="${SVG_PALETTE[i]}"><title>${esc(s.name)} — ${esc(labels[k])} : ${esc(fmt(v))}${s.unit ? " " + esc(s.unit) : ""}</title></path>`;
      if (showValues) out += text(x + bw / 2, up ? yv - 5 : yv + 14, fmt(v), { size: 11, fill: INK, anchor: "middle" });
    });
  });
  return out;
}

function drawPanels(labels, series, top) {
  let out = "";
  const count = series.length;
  const cols = count <= 2 ? count : count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const gapX = 28, gapY = 18, left = 32, right = 32;
  const pw = (W - left - right - gapX * (cols - 1)) / cols;
  const ph = (H - 44 - top - 8 - gapY * (rows - 1)) / rows;
  const sameHue = count > SVG_PALETTE.length;
  series.forEach((s, i) => {
    const px = left + (i % cols) * (pw + gapX), py = top + 8 + Math.floor(i / cols) * (ph + gapY);
    const color = sameHue ? SVG_PALETTE[0] : SVG_PALETTE[i];
    let k = s.data.length - 1; while (k >= 0 && !has(s.data[k])) k--;
    out += `<rect x="${n(px)}" y="${n(py + 3)}" width="10" height="10" rx="2" fill="${color}"/>`;
    out += text(px + 16, py + 12, truncate(s.name + (s.unit && !s.name.includes(s.unit) ? ` (${s.unit})` : ""), Math.floor(pw / 7.4) - 8), { size: 13, weight: "bold" });
    if (k >= 0) out += text(px + pw, py + 12, fmt(s.data[k]), { size: 13, weight: "bold", anchor: "end" });
    const box = { x: px + 46, y: py + 26, w: pw - 46 - 6, h: ph - 26 - 22 };
    const f = frame(box, labels, s.data, { includeZero: false, band: false, ySize: 10, xSize: 10 });
    out += f.svg + linePaths(s, color, f, { r: rows > 2 ? 2.5 : 3, labels });
  });
  return out;
}

/**
 * @param {{ chartConfig: object, labels: string[], series: {name,unit,data}[], allLabels: object }} p
 * @returns {{ svg: string, form: "line"|"column"|"panels", simplified: boolean }}
 */
export function renderSvg({ chartConfig, labels, series, allLabels }) {
  if (!labels?.length || !series?.length) throw new Error("Données insuffisantes pour générer un graphique.");
  const form = pickForm(chartConfig, series, labels);

  let head = text(32, 40, truncate(allLabels.title || "", 96), { size: 20, weight: "bold" });
  let top = 52;
  if (allLabels.subtitle) { head += text(32, 62, allLabels.subtitle, { size: 13, fill: MUTED }); top = 74; }

  const body = form === "panels" ? drawPanels(labels, series, top)
             : form === "column" ? drawColumns(labels, series, top)
             : drawLine(labels, series, top);
  const foot = text(32, H - 14, allLabels.sourceNote || "", { size: 11, fill: MUTED, italic: true });

  const desc = `${allLabels.title || "Graphique"} — ${series.map(s => s.name).join(", ")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(desc)}">` +
    `<rect x="0" y="0" width="${W}" height="${H}" fill="${SURFACE}"/>${head}${body}${foot}</svg>`;

  const nativeLine = ["line", "area", "scatter", "radar"].includes(chartConfig?.pptxType) && !chartConfig?.isCombo;
  const faithful = (form === "line" && chartConfig?.group === "native" && nativeLine)
    || (form === "column" && chartConfig?.pptxType === "bar" && !/stacked/.test(chartConfig?.id || "") && chartConfig?.pptxOptions?.barDir !== "bar")
    || (form === "panels" && chartConfig?.id === "small_multiples");
  return { svg, form, simplified: !faithful };
}

export default { renderSvg, pickForm, SVG_PALETTE };
