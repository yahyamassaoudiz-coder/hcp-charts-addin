/**
 * tornadoChart.js — Tornado / butterfly (v1.2)
 * Two indicators mirrored around a centre axis, one row per year/category.
 * Each side has its own scale (units may differ); negatives clamp to 0 length
 * but keep their signed label.
 */
import { text, rect, line, fmt, accent, MUTED, FAINT, requireSeries, valid } from "./_helpers.js";

export function build(slide, { pptx, labels, series, LAYOUT }) {
  requireSeries(series, 2, "Tornado");
  const [L, R] = series;
  const box = LAYOUT.chart;
  const cx = box.x + box.w / 2;
  const gap = 0.55;
  const half = box.w / 2 - gap - 0.7;
  const maxL = Math.max(...valid(L.data).map(Math.abs), 1e-9);
  const maxR = Math.max(...valid(R.data).map(Math.abs), 1e-9);
  const rowH = (box.h - 0.45) / labels.length;
  const barH = Math.min(rowH * 0.65, 0.42);

  text(slide, L.name + (L.unit ? ` (${L.unit})` : ""), box.x, box.y, box.w / 2 - gap, 0.3, { align: "right", bold: true, color: accent(0), fontSize: 11 });
  text(slide, R.name + (R.unit ? ` (${R.unit})` : ""), cx + gap, box.y, box.w / 2 - gap, 0.3, { align: "left", bold: true, color: accent(1), fontSize: 11 });

  labels.forEach((lab, i) => {
    const cy = box.y + 0.45 + (i + 0.5) * rowH;
    text(slide, lab, cx - gap, cy - barH / 2, gap * 2, barH, { align: "center", fontSize: 10, color: MUTED });
    const vl = L.data[i], vr = R.data[i];
    if (vl !== null && vl !== undefined) {
      const w = Math.max(vl, 0) / maxL * half;
      rect(slide, pptx, cx - gap - w, cy - barH / 2, w, barH, accent(0));
      text(slide, fmt(vl), cx - gap - w - 0.75, cy - barH / 2, 0.7, barH, { align: "right", fontSize: 9 });
    }
    if (vr !== null && vr !== undefined) {
      const w = Math.max(vr, 0) / maxR * half;
      rect(slide, pptx, cx + gap, cy - barH / 2, w, barH, accent(1));
      text(slide, fmt(vr), cx + gap + w + 0.05, cy - barH / 2, 0.7, barH, { align: "left", fontSize: 9 });
    }
  });
  line(slide, pptx, cx - gap, box.y + 0.4, cx - gap, box.y + box.h - 0.05, FAINT, 0.75);
  line(slide, pptx, cx + gap, box.y + 0.4, cx + gap, box.y + box.h - 0.05, FAINT, 0.75);
  return {};
}
export default { build };
