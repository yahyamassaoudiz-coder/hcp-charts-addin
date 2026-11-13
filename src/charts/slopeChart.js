/**
 * slopeChart.js — Slope chart (v1.2)
 * First vs last available year for each indicator. Each indicator is indexed
 * to its own range when units differ (otherwise a shared scale), and rising
 * lines use flipV (v1.1 used negative heights).
 */
import { text, line, dot, fmt, signed, accent, MUTED, FAINT, valid, requireSeries } from "./_helpers.js";

export function build(slide, { pptx, labels, series, LAYOUT }) {
  requireSeries(series, 1, "Pente");
  const box = LAYOUT.chart;
  const firstI = labels.findIndex((_, i) => series.some(s => s.data[i] !== null && s.data[i] !== undefined));
  let lastI = -1;
  for (let i = labels.length - 1; i >= 0; i--) if (series.some(s => s.data[i] !== null && s.data[i] !== undefined)) { lastI = i; break; }
  if (firstI < 0 || lastI <= firstI) throw new Error("« Pente » nécessite au moins 2 années.");

  const rows = series.map((s, k) => ({ s, k, a: s.data[firstI], b: s.data[lastI] })).filter(r => r.a != null && r.b != null);
  const units = new Set(rows.map(r => r.s.unit));
  const shared = units.size <= 1;
  const all = rows.flatMap(r => [r.a, r.b]);
  const gMin = Math.min(...all), gMax = Math.max(...all);

  const leftX = box.x + 3.2, rightX = box.x + box.w - 3.2;
  const top = box.y + 0.5, h = box.h - 0.7;
  const yOf = (r, v) => {
    const lo = shared ? gMin : Math.min(r.a, r.b), hi = shared ? gMax : Math.max(r.a, r.b);
    const t = hi === lo ? 0.5 : (v - lo) / (hi - lo);
    return top + h - t * h;
  };

  text(slide, labels[firstI], leftX - 1, box.y, 2, 0.35, { align: "center", bold: true, fontSize: 13 });
  text(slide, labels[lastI], rightX - 1, box.y, 2, 0.35, { align: "center", bold: true, fontSize: 13 });
  line(slide, pptx, leftX, top - 0.1, leftX, top + h + 0.1, FAINT, 1);
  line(slide, pptx, rightX, top - 0.1, rightX, top + h + 0.1, FAINT, 1);

  rows.forEach(r => {
    const c = accent(r.k);
    const ya = yOf(r, r.a), yb = yOf(r, r.b);
    line(slide, pptx, leftX, ya, rightX, yb, c, 2.5);
    dot(slide, pptx, leftX, ya, 0.08, c);
    dot(slide, pptx, rightX, yb, 0.08, c);
    text(slide, `${r.s.name}  ${fmt(r.a)}`, box.x, ya - 0.13, leftX - box.x - 0.15, 0.26, { align: "right", fontSize: 10, color: c });
    text(slide, `${fmt(r.b)}   ${signed(r.b - r.a)}`, rightX + 0.15, yb - 0.13, 3, 0.26, { align: "left", fontSize: 10, color: c, bold: true });
  });
  if (!shared) {
    text(slide, "Échelle propre à chaque indicateur (unités différentes)", box.x, box.y + box.h - 0.1, box.w, 0.22, { align: "center", fontSize: 8, color: MUTED, italic: true });
  }
  return {};
}
export default { build };
