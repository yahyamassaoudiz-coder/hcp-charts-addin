/**
 * gaugeChart.js — Gauge (v1.2)
 * Native doughnut (editable) with a theme-coloured hidden half; the latest value
 * is shown against a max (100 for % / ‰ units, else 120% of the series max).
 * v1.1 masked the bottom half with a white rectangle, which breaks on any
 * non-white background; the hidden slice is now noFill.
 */
import { text, fmt, lastValid, valid, accent, MUTED, requireSeries } from "./_helpers.js";

export function build(slide, { pptx, labels, series, LAYOUT, allLabels }) {
  requireSeries(series, 1, "Jauge");
  const s = series[0];
  const { value, index } = lastValid(s.data);
  if (value === null) throw new Error("« Jauge » : aucune valeur disponible.");
  const unit = s.unit || "";
  const max = (unit === "%" ) ? 100 : (unit === "‰" ? 1000 : Math.max(...valid(s.data)) * 1.2 || 1);
  const pct = Math.max(0, Math.min(value / max, 1));

  const size = Math.min(LAYOUT.chart.w * 0.55, LAYOUT.chart.h * 1.5);
  const cx = LAYOUT.chart.x + LAYOUT.chart.w / 2;
  const top = LAYOUT.chart.y + 0.1;

  slide.addChart(pptx.charts.DOUGHNUT, [{
    name: s.name, labels: ["Valeur", "Restant", "__hidden"],
    values: [pct * 50, (1 - pct) * 50, 50]
  }], {
    x: cx - size / 2, y: top, w: size, h: size,
    chartColors: [accent(0), "D9D9D9", "FFFFFF"],
    showLegend: false, showValue: false, showPercent: false, showTitle: false,
    holeSize: 62, firstSliceAng: 270, dataBorder: { pt: 0, color: "FFFFFF" }
  });

  const cy = top + size / 2;
  text(slide, fmt(value) + (unit === "%" ? " %" : ""), cx - 2, cy - 0.85, 4, 0.75,
    { align: "center", fontSize: 40, bold: true, fontFace: "+mj-lt", color: accent(0) });
  text(slide, `${s.name} · ${labels[index]}`, cx - 3, cy - 0.1, 6, 0.3, { align: "center", fontSize: 12, color: MUTED });
  text(slide, "0", cx - size / 2 + size * 0.06, cy + 0.02, 0.6, 0.2, { align: "left", fontSize: 9, color: MUTED });
  text(slide, fmt(max), cx + size / 2 - size * 0.06 - 0.6, cy + 0.02, 0.6, 0.2, { align: "right", fontSize: 9, color: MUTED });
  return { hiddenCategories: ["__hidden"] };
}
export default { build };
