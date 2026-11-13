/**
 * heatmapChart.js — Heatmap (v1.2, NEW)
 * Rows = indicators, columns = years. Each row is coloured on its own scale
 * (accent1 shade from light to full) so different units stay comparable.
 */
import { text, fmt, valid, MUTED } from "./_helpers.js";

export function build(slide, { pptx, labels, series, LAYOUT }) {
  const box = LAYOUT.chart;
  const labelW = 2.6;
  const cw = (box.w - labelW) / labels.length;
  const rh = Math.min(0.6, (box.h - 0.35) / series.length);
  const shades = [90000, 75000, 60000, 45000, 30000, 0]; // lumOff steps (lighter -> full)

  labels.forEach((l, j) => text(slide, l, box.x + labelW + j * cw, box.y, cw, 0.3,
    { align: "center", fontSize: labels.length > 14 ? 7 : 9, color: MUTED }));

  series.forEach((s, i) => {
    const y = box.y + 0.35 + i * rh;
    text(slide, s.name + (s.unit ? ` (${s.unit})` : ""), box.x, y, labelW - 0.1, rh, { align: "right", fontSize: 10 });
    const v = valid(s.data);
    const lo = Math.min(...v), hi = Math.max(...v);
    s.data.forEach((val, j) => {
      const x = box.x + labelW + j * cw;
      if (val === null || val === undefined) {
        slide.addShape(pptx.shapes.RECTANGLE, { x: x + 0.01, y: y + 0.01, w: cw - 0.02, h: rh - 0.02,
          fill: { color: "F2F2F2" }, line: { type: "none" } });
        return;
      }
      const t = hi === lo ? 1 : (val - lo) / (hi - lo);
      const step = Math.min(shades.length - 1, Math.round(t * (shades.length - 1)));
      slide.addShape(pptx.shapes.RECTANGLE, {
        x: x + 0.01, y: y + 0.01, w: cw - 0.02, h: rh - 0.02,
        fill: { color: "accent1", transparency: Math.round(shades[step] / 1000) },
        line: { type: "none" }
      });
      if (cw > 0.45) text(slide, fmt(val), x, y, cw, rh,
        { align: "center", fontSize: cw > 0.7 ? 9 : 7, color: step >= 3 ? "FFFFFF" : "tx1" });
    });
  });
  return {};
}
export default { build };
