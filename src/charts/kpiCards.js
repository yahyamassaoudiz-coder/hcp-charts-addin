/**
 * kpiCards.js — KPI cards (v1.2, NEW)
 * One card per indicator: latest value, unit, change vs previous available year.
 * Best for "single year" snapshots of several KPIs.
 */
import { text, rect, fmt, signed, accent, MUTED, POSITIVE, NEGATIVE, requireSeries } from "./_helpers.js";

export function build(slide, { pptx, labels, series, LAYOUT }) {
  requireSeries(series, 1, "Cartes KPI");
  const n = series.length;
  const cols = Math.min(n, 4);
  const rows = Math.ceil(n / cols);
  const gap = 0.25;
  const cw = (LAYOUT.chart.w - gap * (cols - 1)) / cols;
  const ch = Math.min(2.2, (LAYOUT.chart.h - gap * (rows - 1)) / rows);

  series.forEach((s, i) => {
    const x = LAYOUT.chart.x + (i % cols) * (cw + gap);
    const y = LAYOUT.chart.y + Math.floor(i / cols) * (ch + gap);
    const pts = s.data.map((v, j) => ({ v, l: labels[j] })).filter(p => p.v !== null && p.v !== undefined);
    const last = pts[pts.length - 1], prev = pts[pts.length - 2];
    slide.addShape(pptx.shapes.RECTANGLE, { x, y, w: cw, h: ch, fill: { color: "F2F2F2" }, line: { type: "none" } });
    rect(slide, pptx, x, y, 0.08, ch, accent(i));
    text(slide, s.name, x + 0.25, y + 0.15, cw - 0.4, 0.4, { fontSize: 12, bold: true });
    text(slide, last ? fmt(last.v) : "—", x + 0.25, y + 0.6, cw - 0.4, 0.8, { fontSize: 36, bold: true, fontFace: "+mj-lt", color: accent(i) });
    text(slide, (s.unit || "") + (last ? ` · ${last.l}` : ""), x + 0.25, y + 1.35, cw - 0.4, 0.25, { fontSize: 10, color: MUTED });
    if (last && prev) {
      const d = last.v - prev.v;
      text(slide, `${signed(d)} vs ${prev.l}`, x + 0.25, y + 1.65, cw - 0.4, 0.3,
        { fontSize: 11, bold: true, color: d >= 0 ? POSITIVE : NEGATIVE });
    }
  });
  return {};
}
export default { build };
