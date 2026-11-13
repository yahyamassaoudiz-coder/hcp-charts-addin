/**
 * ChartEngine.js — Native OOXML chart builder (v1.2)
 * ===================================================
 * v1.2 fixes:
 *   - Chart/shape enums come from the PptxGenJS INSTANCE (pptx.charts,
 *     pptx.shapes). The class has no static `charts` -> v1.1 crashed.
 *   - Combo charts use the real multi-type API: addChart([{type,data,options}], opts)
 *   - Colours are theme references (accent1..6, tx1, bg1) and fonts are theme
 *     fonts (+mj-lt / +mn-lt), then ThemeAdapter cleans what PptxGenJS hardcodes,
 *     so useDestinationTheme actually recolours the chart.
 *   - Nulls stay null (gaps) instead of being plotted as 0.
 *   - Scatter gets the X-values series PptxGenJS expects.
 */

import PptxGenJS from "pptxgenjs";
import LabelBuilder from "./LabelBuilder.js";
import { adaptToTheme } from "./ThemeAdapter.js";
import { CHARTS_BY_ID } from "../constants/chartTypes.js";

export const ACCENTS = ["accent1", "accent2", "accent3", "accent4", "accent5", "accent6"];

export const LAYOUT = {
  slideWidth: 13.333, slideHeight: 7.5,
  chart:    { x: 0.8, y: 1.4, w: 11.5, h: 5.0 },
  title:    { x: 0.5, y: 0.3,  w: 12.3, h: 0.5, fontSize: 24 },
  subtitle: { x: 0.5, y: 0.85, w: 12.3, h: 0.4, fontSize: 13 },
  source:   { x: 0.5, y: 6.85, w: 12.3, h: 0.3, fontSize: 9 }
};

const TEXT = "tx1";
const MUTED = "7F7F7F";   // grey -> mapped to a tx1 tint by ThemeAdapter
const GRID = "D9D9D9";

function seriesColors(n) {
  return Array.from({ length: n }, (_, i) => ACCENTS[i % ACCENTS.length]);
}

function addHeader(slide, allLabels) {
  slide.addText(allLabels.title, {
    ...LAYOUT.title, fontFace: "+mj-lt", bold: true, color: TEXT,
    align: "left", valign: "bottom", margin: 0
  });
  if (allLabels.hasSubtitle) {
    slide.addText(allLabels.subtitle, {
      ...LAYOUT.subtitle, fontFace: "+mn-lt", color: MUTED,
      align: "left", valign: "top", margin: 0
    });
  }
  slide.addText(allLabels.sourceNote, {
    ...LAYOUT.source, fontFace: "+mn-lt", color: MUTED, italic: true,
    align: "left", valign: "top", margin: 0
  });
}

function baseChartOptions(allLabels, nSeries) {
  return {
    ...LAYOUT.chart,
    showTitle: false,
    showLegend: nSeries > 1, legendPos: "b",
    legendFontSize: 11, legendFontFace: "+mn-lt", legendColor: TEXT,
    catAxisLabelColor: MUTED, catAxisLabelFontSize: 11, catAxisLabelFontFace: "+mn-lt",
    catAxisTitle: allLabels.xAxisTitle, showCatAxisTitle: false,
    catAxisTitleColor: MUTED, catAxisTitleFontFace: "+mn-lt",
    valAxisLabelColor: MUTED, valAxisLabelFontSize: 11, valAxisLabelFontFace: "+mn-lt",
    valAxisTitle: allLabels.yAxisTitle, showValAxisTitle: allLabels.hasYAxis,
    valAxisTitleColor: MUTED, valAxisTitleFontSize: 11, valAxisTitleFontFace: "+mn-lt",
    catAxisLineShow: true, valAxisLineShow: false,
    catGridLine: { style: "none" },
    valGridLine: { style: "solid", color: GRID, size: 0.75 },
    dataLabelFontFace: "+mn-lt", dataLabelColor: TEXT,
    displayBlanksAs: "gap",
    showValue: false,
    chartColors: seriesColors(nSeries)
  };
}

function toChartData(labels, series) {
  return series.map((s, i) => ({
    name: s.name || `Série ${i + 1}`,
    labels,
    values: s.data.map(v => (v === undefined ? null : v))
  }));
}

/** Native chart on an existing slide. Exported for multi-chart decks. */
export function buildNativeChart(pptx, slide, chartConfig, labels, series, allLabels) {
  const types = {
    bar: pptx.charts.BAR, line: pptx.charts.LINE, area: pptx.charts.AREA,
    pie: pptx.charts.PIE, doughnut: pptx.charts.DOUGHNUT,
    scatter: pptx.charts.SCATTER, radar: pptx.charts.RADAR
  };
  const chartType = types[chartConfig.pptxType] || pptx.charts.BAR;
  const opts = { ...baseChartOptions(allLabels, series.length), ...chartConfig.pptxOptions };
  const data = toChartData(labels, series);

  // ── Combo: first series as columns, the rest as lines on a secondary axis
  if (chartConfig.isCombo) {
    if (series.length < 2) {
      slide.addChart(pptx.charts.BAR, data, { ...opts, barDir: "col" });
      return;
    }
    const { secondaryValAxis, ...rest } = opts;
    slide.addChart(
      [
        { type: pptx.charts.BAR, data: [data[0]],
          options: { barDir: "col", barGrouping: "clustered", chartColors: [ACCENTS[0]] } },
        { type: pptx.charts.LINE, data: data.slice(1),
          options: { chartColors: seriesColors(series.length).slice(1), lineDataSymbol: "circle",
                     lineDataSymbolSize: 7, secondaryValAxis: true, secondaryCatAxis: true } }
      ],
      {
        ...rest,
        showLegend: true,
        valAxes: [
          { showValAxisTitle: !!data[0].name, valAxisTitle: data[0].name,
            valAxisLabelColor: MUTED, valAxisTitleColor: MUTED, valAxisLabelFontFace: "+mn-lt",
            valGridLine: { style: "solid", color: GRID, size: 0.75 } },
          { showValAxisTitle: true, valAxisTitle: data.slice(1).map(d => d.name).join(", "),
            valAxisLabelColor: MUTED, valAxisTitleColor: MUTED, valAxisLabelFontFace: "+mn-lt",
            valGridLine: { style: "none" } }
        ],
        catAxes: [{ catAxisTitle: allLabels.xAxisTitle, catAxisLabelColor: MUTED }, { catAxisHidden: true }]
      }
    );
    return;
  }

  // ── Pie / doughnut: one series, one slice per category
  if (chartConfig.pptxType === "pie" || chartConfig.pptxType === "doughnut") {
    slide.addChart(chartType, [{ ...data[0], values: data[0].values.map(v => v ?? 0) }], {
      ...opts,
      chartColors: seriesColors(labels.length),
      showLegend: true, legendPos: "r",
      showPercent: true, showValue: false,
      dataLabelPosition: "bestFit", dataLabelFontSize: 11
    });
    return;
  }

  // ── Scatter: first data entry is the X axis
  if (chartConfig.pptxType === "scatter") {
    const xs = labels.map(l => (isNaN(Number(l)) ? null : Number(l)));
    slide.addChart(chartType, [{ name: allLabels.xAxisTitle || "X", values: xs }, ...data], {
      ...opts, lineSize: 0, lineDataSymbol: "circle", lineDataSymbolSize: 9
    });
    return;
  }

  slide.addChart(chartType, data, opts);
}

async function loadAdvancedBuilder(builderName) {
  const builders = {
    waterfallChart: () => import("../charts/waterfallChart.js"),
    lollipopChart:  () => import("../charts/lollipopChart.js"),
    dumbbellChart:  () => import("../charts/dumbbellChart.js"),
    gaugeChart:     () => import("../charts/gaugeChart.js"),
    tornadoChart:   () => import("../charts/tornadoChart.js"),
    slopeChart:     () => import("../charts/slopeChart.js"),
    waffleChart:    () => import("../charts/waffleChart.js"),
    marimekkoChart: () => import("../charts/marimekkoChart.js"),
    smallMultiples: () => import("../charts/smallMultiples.js"),
    heatmapChart:   () => import("../charts/heatmapChart.js"),
    kpiCards:       () => import("../charts/kpiCards.js"),
    varianceChart:  () => import("../charts/varianceChart.js")
  };
  const loader = builders[builderName];
  if (!loader) throw new Error(`Constructeur avancé inconnu: ${builderName}`);
  const mod = await loader();
  return mod.default || mod;
}

async function renderSlide(pptx, { chartType, labels, series, filterParams }) {
  if (!labels.length || !series.length) {
    throw new Error("Données insuffisantes pour générer un graphique.");
  }
  const chartConfig = typeof chartType === "string" ? CHARTS_BY_ID[chartType] : chartType;
  if (!chartConfig) throw new Error(`Type de graphique inconnu: ${chartType}`);

  const slide = pptx.addSlide();
  const allLabels = LabelBuilder.buildAllLabels(filterParams || {});
  addHeader(slide, allLabels);

  let meta = {};
  if (chartConfig.group === "advanced" && chartConfig.builder) {
    const builder = await loadAdvancedBuilder(chartConfig.builder);
    meta = (await builder.build(slide, { pptx, labels, series, allLabels, LAYOUT })) || {};
  } else {
    buildNativeChart(pptx, slide, chartConfig, labels, series, allLabels);
  }
  return meta;
}

function newDeck() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.theme = { headFontFace: "+mj-lt", bodyFontFace: "+mn-lt" };
  return pptx;
}

/**
 * Build a one-slide PPTX (base64) containing a native chart.
 * @param {{chartType: string|object, labels: string[], series: {name,data,unit}[], filterParams: object}} params
 */
export async function buildChart(params) {
  const pptx = newDeck();
  const meta = await renderSlide(pptx, params);
  const raw = await pptx.write({ outputType: "base64" });
  return adaptToTheme(raw, {
    transparentSeries: meta.transparentSeries || [],
    hiddenCategories: meta.hiddenCategories || []
  });
}

/** Several charts, one slide each. */
export async function buildMultipleCharts(chartDataSets) {
  const pptx = newDeck();
  const transparent = new Set(), hidden = new Set();
  for (const ds of chartDataSets) {
    const meta = await renderSlide(pptx, ds);
    (meta.transparentSeries || []).forEach(n => transparent.add(n));
    (meta.hiddenCategories || []).forEach(n => hidden.add(n));
  }
  const raw = await pptx.write({ outputType: "base64" });
  return adaptToTheme(raw, { transparentSeries: [...transparent], hiddenCategories: [...hidden] });
}

const ChartEngine = { buildChart, buildMultipleCharts, ACCENTS, LAYOUT };
export default ChartEngine;
