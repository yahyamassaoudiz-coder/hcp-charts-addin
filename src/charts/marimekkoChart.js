/**
 * marimekkoChart.js — Marimekko (v1.2)
 * Columns = categories (years), column width ∝ column total, segments = share of
 * each indicator. Only meaningful for additive components in the SAME unit
 * (e.g. exports vs imports in Mrd MAD) — mixed units or rates are rejected.
 */
import { text, rect, line, fmt, accent, MUTED, FAINT, requireSeries } from "./_helpers.js";

export function build(slide, { pptx, labels, series, LAYOUT }) {
  requireSeries(series, 2, "Marimekko");
  const units = new Set(series.map(s => s.unit));
  if (units.size > 1) throw new Error("« Marimekko » exige des indicateurs de même unité (composantes additives).");
  if ([...units][0] === "%" || [...units][0] === "‰") throw new Error("« Marimekko » ne s'applique pas à des taux (% / ‰).");

  const cols = labels.map((l, c) => ({ l, vals: series.map(s => Math.max(s.data[c] ?? 0, 0)) }))
    .map(c => ({ ...c, total: c.vals.reduce((a, b) => a + b, 0) })).filter(c => c.total > 0);
  const grand = cols.reduce((a, c) => a + c.total, 0);
  const box = { x: LAYOUT.chart.x + 0.6, y: LAYOUT.chart.y + 0.35, w: LAYOUT.chart.w - 0.6, h: LAYOUT.chart.h - 1.0 };
  const gap = 0.03;
  const usable = box.w - gap * (cols.length - 1);

  series.forEach((s, k) => {
    rect(slide, pptx, box.x + k * 2.2, LAYOUT.chart.y, 0.18, 0.16, accent(k));
    text(slide, s.name, box.x + k * 2.2 + 0.25, LAYOUT.chart.y - 0.03, 1.9, 0.22, { fontSize: 9 });
  });
  [0, 25, 50, 75, 100].forEach(p => {
    const yy = box.y + box.h - (p / 100) * box.h;
    line(slide, pptx, box.x, yy, box.x + box.w, yy, FAINT, 0.4);
    text(slide, p + " %", box.x - 0.6, yy - 0.1, 0.5, 0.2, { align: "right", fontSize: 9, color: MUTED });
  });

  let x = box.x;
  cols.forEach(c => {
    const w = (c.total / grand) * usable;
    let yb = box.y + box.h;
    c.vals.forEach((v, k) => {
      const h = (v / c.total) * box.h;
      yb -= h;
      rect(slide, pptx, x, yb, w, h, accent(k), { line: { color: "FFFFFF", width: 0.75 } });
      if (h > 0.3 && w > 0.45) text(slide, Math.round(v / c.total * 100) + " %", x, yb, w, h, { align: "center", fontSize: 9, color: "FFFFFF" });
    });
    text(slide, c.l, x, box.y + box.h + 0.05, w, 0.24, { align: "center", fontSize: 9, color: MUTED });
    text(slide, fmt(c.total), x, box.y + box.h + 0.28, w, 0.2, { align: "center", fontSize: 8, color: MUTED });
    x += w + gap;
  });
  return {};
}
export default { build };
