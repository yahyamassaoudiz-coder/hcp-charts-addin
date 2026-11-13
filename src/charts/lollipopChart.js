/**
 * lollipopChart.js — Lollipop (v1.2): vertical stems per category, theme colours,
 * handles negatives and nulls.
 */
import { text, rect, dot, fmt, accent, MUTED, requireSeries } from "./_helpers.js";
import { valueFrame } from "./_axis.js";

export function build(slide, { pptx, labels, series, LAYOUT }) {
  requireSeries(series, 1, "Sucette");
  const vals = series[0].data;
  const { plot, y } = valueFrame(slide, pptx, { ...LAYOUT.chart, h: LAYOUT.chart.h - 0.4 }, vals);
  const slot = plot.w / labels.length;
  const r = Math.min(0.12, slot * 0.25);
  labels.forEach((l, i) => {
    const cx = plot.x + (i + 0.5) * slot;
    const v = vals[i];
    if (v !== null && v !== undefined) {
      const y0 = y(0), y1 = y(v);
      rect(slide, pptx, cx - 0.012, Math.min(y0, y1), 0.024, Math.abs(y1 - y0), accent(0));
      dot(slide, pptx, cx, y1, r, accent(0));
      text(slide, fmt(v), cx - 0.4, v >= 0 ? y1 - r - 0.26 : y1 + r + 0.02, 0.8, 0.24, { align: "center", fontSize: 9 });
    }
    text(slide, l, cx - slot / 2, plot.y + plot.h + 0.08, slot, 0.28,
      { align: "center", fontSize: labels.length > 14 ? 8 : 10, color: MUTED });
  });
  return {};
}
export default { build };
