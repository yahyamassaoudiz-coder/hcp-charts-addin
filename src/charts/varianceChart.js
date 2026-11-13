/**
 * varianceChart.js — Year-on-year variance (v1.2, NEW)
 * Native clustered column chart of Δ vs previous year (absolute, or in points
 * for % indicators). Editable in PowerPoint like any native chart.
 */
import { accent, MUTED, requireSeries } from "./_helpers.js";

export function build(slide, { pptx, labels, series, LAYOUT, allLabels }) {
  requireSeries(series, 1, "Variation annuelle");
  const deltaLabels = labels.slice(1);
  if (!deltaLabels.length) throw new Error("« Variation annuelle » nécessite au moins 2 années.");
  const data = series.map(s => ({
    name: s.name + (s.unit === "%" ? " (Δ pts)" : " (Δ)"),
    labels: deltaLabels,
    values: s.data.slice(1).map((v, i) => (v == null || s.data[i] == null) ? null : +(v - s.data[i]).toFixed(4))
  }));
  slide.addChart(pptx.charts.BAR, data, {
    ...LAYOUT.chart, barDir: "col", barGrouping: "clustered",
    chartColors: series.map((_, i) => accent(i)),
    invertIfNegative: false,
    showLegend: series.length > 1, legendPos: "b", legendFontFace: "+mn-lt",
    showValue: series.length === 1, dataLabelFormatCode: "+#,##0.0;-#,##0.0;0",
    dataLabelFontSize: 9, dataLabelFontFace: "+mn-lt", dataLabelPosition: "outEnd",
    catAxisLabelColor: MUTED, valAxisLabelColor: MUTED,
    catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt",
    valAxisLabelFormatCode: "+#,##0.0;-#,##0.0;0",
    catGridLine: { style: "none" }, valGridLine: { style: "solid", color: "D9D9D9", size: 0.5 },
    displayBlanksAs: "gap", showTitle: false
  });
  return {};
}
export default { build };
