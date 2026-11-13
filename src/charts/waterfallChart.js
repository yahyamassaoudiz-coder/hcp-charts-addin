/**
 * waterfallChart.js — Waterfall / bridge (v1.2, shape-built)
 * HCP series are LEVELS by year, so the bridge is:
 *   level(first year) -> year-on-year changes -> level(last year)
 * v1.1 treated levels as deltas and produced wrong totals; it also broke on
 * negative values. This version handles both.
 */
import { text, rect, line, signed, fmt, valid, POSITIVE, NEGATIVE, accent, MUTED, FAINT, requireSeries } from "./_helpers.js";
import { valueFrame } from "./_axis.js";

export function build(slide, { pptx, labels, series, LAYOUT }) {
  requireSeries(series, 1, "Cascade");
  const pts = labels.map((l, i) => ({ l, v: series[0].data[i] })).filter(p => p.v !== null && p.v !== undefined);
  if (pts.length < 2) throw new Error("« Cascade » nécessite au moins 2 années de données.");

  const bars = [{ label: pts[0].l, from: 0, to: pts[0].v, kind: "total" }];
  for (let i = 1; i < pts.length; i++) {
    bars.push({ label: "Δ " + pts[i].l, from: pts[i - 1].v, to: pts[i].v, kind: pts[i].v >= pts[i - 1].v ? "up" : "down" });
  }
  bars.push({ label: pts[pts.length - 1].l, from: 0, to: pts[pts.length - 1].v, kind: "total" });

  const { plot, y } = valueFrame(slide, pptx, { ...LAYOUT.chart, h: LAYOUT.chart.h - 0.45 }, bars.flatMap(b => [b.from, b.to]));
  const slot = plot.w / bars.length;
  const bw = Math.min(slot * 0.62, 0.9);
  const colors = { total: accent(0), up: POSITIVE, down: NEGATIVE };

  bars.forEach((b, i) => {
    const x = plot.x + i * slot + (slot - bw) / 2;
    const top = y(Math.max(b.from, b.to));
    const bottom = y(Math.min(b.from, b.to));
    rect(slide, pptx, x, top, bw, Math.max(bottom - top, 0.015), colors[b.kind]);
    const delta = b.to - b.from;
    const lbl = b.kind === "total" ? fmt(b.to) : signed(delta);
    const above = b.kind === "total" ? b.to >= 0 : delta >= 0;
    text(slide, lbl, x - 0.2, above ? top - 0.26 : bottom + 0.02, bw + 0.4, 0.24,
      { align: "center", fontSize: 10, bold: b.kind === "total" });
    text(slide, b.label, x - 0.25, plot.y + plot.h + 0.08, bw + 0.5, 0.3,
      { align: "center", fontSize: bars.length > 14 ? 8 : 10, color: MUTED });
    if (i < bars.length - 1) {
      const level = b.kind === "total" ? b.to : b.to;
      const nx = plot.x + (i + 1) * slot + (slot - bw) / 2;
      line(slide, pptx, x + bw, y(level), nx, y(level), FAINT, 0.75, { dashType: "dash" });
    }
  });
  return {};
}
export default { build };
