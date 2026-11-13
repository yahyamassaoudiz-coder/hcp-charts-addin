/**
 * smallMultiples.js — Small multiples (v1.2)
 * One NATIVE mini line chart per indicator (editable, theme-coloured), each on
 * its own scale because indicators usually have different units.
 */
import { text, fmt, lastValid, accent, MUTED, requireSeries } from "./_helpers.js";

export function build(slide, { pptx, labels, series, LAYOUT }) {
  requireSeries(series, 1, "Petits multiples");
  const n = series.length;
  const cols = Math.min(n, n <= 4 ? 2 : 3);
  const rows = Math.ceil(n / cols);
  const pad = 0.2;
  const cw = (LAYOUT.chart.w - pad * (cols - 1)) / cols;
  const ch = (LAYOUT.chart.h - pad * (rows - 1)) / rows;

  series.forEach((s, i) => {
    const x = LAYOUT.chart.x + (i % cols) * (cw + pad);
    const y = LAYOUT.chart.y + Math.floor(i / cols) * (ch + pad);
    const { value } = lastValid(s.data);
    text(slide, s.name, x, y, cw * 0.7, 0.28, { bold: true, fontSize: 11, color: accent(i) });
    text(slide, fmt(value) + (s.unit ? " " + s.unit : ""), x + cw * 0.6, y, cw * 0.4, 0.28, { align: "right", fontSize: 10, color: MUTED });
    slide.addChart(pptx.charts.LINE, [{ name: s.name, labels, values: s.data }], {
      x, y: y + 0.3, w: cw, h: ch - 0.3,
      chartColors: [accent(i)], lineSize: 2, lineDataSymbol: "none",
      showLegend: false, showTitle: false, displayBlanksAs: "gap",
      catAxisLabelFontSize: 8, valAxisLabelFontSize: 8,
      catAxisLabelColor: MUTED, valAxisLabelColor: MUTED,
      catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt",
      catGridLine: { style: "none" }, valGridLine: { style: "solid", color: "E7E6E6", size: 0.5 },
      catAxisLabelFrequency: Math.max(1, Math.ceil(labels.length / 5))
    });
  });
  return {};
}
export default { build };
