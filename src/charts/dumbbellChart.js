/**
 * dumbbellChart.js — Dumbbell (v1.2)
 * 2+ indicators: one row per indicator comparing FIRST vs LAST year.
 * 1 indicator:   one row comparing first vs last year as well.
 * (v1.1 compared two indicators per YEAR, mixing units on one axis.)
 */
import { text, rect, dot, fmt, accent, MUTED, FAINT, line, requireSeries, valid } from "./_helpers.js";

export function build(slide, { pptx, labels, series, LAYOUT }) {
  requireSeries(series, 1, "Haltère");
  const firstIdx = (s) => s.data.findIndex(v => v !== null && v !== undefined);
  const lastIdx = (s) => { for (let i = s.data.length - 1; i >= 0; i--) if (s.data[i] !== null && s.data[i] !== undefined) return i; return -1; };
  const rows = series.map(s => ({ name: s.name, unit: s.unit, a: s.data[firstIdx(s)], b: s.data[lastIdx(s)],
    la: labels[firstIdx(s)], lb: labels[lastIdx(s)] })).filter(r => r.a !== undefined && r.b !== undefined);

  const box = LAYOUT.chart;
  const labelW = 2.8;
  const px = box.x + labelW, pw = box.w - labelW - 0.8;
  const rowH = Math.min(0.7, (box.h - 0.5) / rows.length);

  // legend
  dot(slide, pptx, px + 0.1, box.y + 0.1, 0.08, accent(1));
  text(slide, rows[0]?.la ?? "", px + 0.25, box.y, 1.2, 0.2, { fontSize: 10, color: MUTED });
  dot(slide, pptx, px + 1.6, box.y + 0.1, 0.08, accent(0));
  text(slide, rows[0]?.lb ?? "", px + 1.75, box.y, 1.2, 0.2, { fontSize: 10, color: MUTED });

  rows.forEach((r, i) => {
    // each row has its own scale (indicators can have different units)
    const lo = Math.min(r.a, r.b, 0), hi = Math.max(r.a, r.b);
    const span = hi - lo || 1;
    const x = (v) => px + ((v - lo) / span) * pw;
    const cy = box.y + 0.5 + (i + 0.5) * rowH;
    line(slide, pptx, px, cy, px + pw, cy, FAINT, 0.5);
    text(slide, r.name + (r.unit ? ` (${r.unit})` : ""), box.x, cy - rowH / 2, labelW - 0.15, rowH, { align: "right", fontSize: 10 });
    rect(slide, pptx, Math.min(x(r.a), x(r.b)), cy - 0.025, Math.abs(x(r.b) - x(r.a)), 0.05, FAINT);
    dot(slide, pptx, x(r.a), cy, 0.1, accent(1));
    dot(slide, pptx, x(r.b), cy, 0.1, accent(0));
    text(slide, fmt(r.a), x(r.a) - 0.5, cy - 0.34, 1, 0.2, { align: "center", fontSize: 9, color: MUTED });
    text(slide, fmt(r.b), x(r.b) - 0.5, cy + 0.13, 1, 0.2, { align: "center", fontSize: 9, bold: true });
  });
  return {};
}
export default { build };
