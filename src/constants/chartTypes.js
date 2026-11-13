/**
 * chartTypes.js — Chart catalogue & context-aware suggestion (v1.2)
 * ==================================================================
 * 16 native PowerPoint charts (editable chart objects, data in embedded Excel)
 * + 12 advanced charts (native mini-charts or theme-coloured shapes).
 *
 * Each entry declares what data it can render:
 *   minSeries / maxSeries   number of indicators accepted
 *   minPoints               number of years needed
 *   sameUnit                all indicators must share a unit
 *   percentOnly             single % indicator only
 */

export const CHART_GROUPS = [
  { id: "native",   label: "Graphiques natifs PowerPoint" },
  { id: "advanced", label: "Graphiques avancés" }
];

const N = (o) => ({ group: "native", minSeries: 1, maxSeries: 12, minPoints: 1, ...o });
const A = (o) => ({ group: "advanced", minSeries: 1, maxSeries: 12, minPoints: 1, ...o });

export const NATIVE_CHARTS = [
  N({ id: "column_clustered", label: "Colonnes groupées", icon: "📊", pptxType: "bar",
      pptxOptions: { barDir: "col", barGrouping: "clustered", barGapWidthPct: 60 },
      description: "Comparer des valeurs côte à côte" }),
  N({ id: "column_stacked", label: "Colonnes empilées", icon: "📊", pptxType: "bar",
      pptxOptions: { barDir: "col", barGrouping: "stacked", barGapWidthPct: 60 }, minSeries: 2, sameUnit: true,
      description: "Composition et total par catégorie" }),
  N({ id: "column_stacked_100", label: "Colonnes empilées 100 %", icon: "📊", pptxType: "bar",
      pptxOptions: { barDir: "col", barGrouping: "percentStacked", barGapWidthPct: 60 }, minSeries: 2, sameUnit: true,
      description: "Parts relatives par catégorie" }),
  N({ id: "bar_clustered", label: "Barres groupées", icon: "📶", pptxType: "bar",
      pptxOptions: { barDir: "bar", barGrouping: "clustered", barGapWidthPct: 60 },
      description: "Comparaison horizontale" }),
  N({ id: "bar_stacked", label: "Barres empilées", icon: "📶", pptxType: "bar",
      pptxOptions: { barDir: "bar", barGrouping: "stacked" }, minSeries: 2, sameUnit: true,
      description: "Composition horizontale" }),
  N({ id: "bar_stacked_100", label: "Barres empilées 100 %", icon: "📶", pptxType: "bar",
      pptxOptions: { barDir: "bar", barGrouping: "percentStacked" }, minSeries: 2, sameUnit: true,
      description: "Parts relatives horizontales" }),
  N({ id: "line", label: "Courbe", icon: "📈", pptxType: "line", minPoints: 2,
      pptxOptions: { lineSize: 2.5, lineDataSymbol: "none" }, description: "Évolution dans le temps" }),
  N({ id: "line_markers", label: "Courbe avec marqueurs", icon: "📈", pptxType: "line", minPoints: 2,
      pptxOptions: { lineSize: 2.5, lineDataSymbol: "circle", lineDataSymbolSize: 7 },
      description: "Évolution avec points visibles" }),
  N({ id: "line_smooth", label: "Courbe lissée", icon: "📈", pptxType: "line", minPoints: 3,
      pptxOptions: { lineSize: 2.5, lineSmooth: true, lineDataSymbol: "none" }, description: "Tendance lissée" }),
  N({ id: "area", label: "Aire", icon: "🏔️", pptxType: "area", minPoints: 2, maxSeries: 1,
      pptxOptions: {}, description: "Volume dans le temps" }),
  N({ id: "area_stacked", label: "Aire empilée", icon: "🏔️", pptxType: "area", minPoints: 2, minSeries: 2, sameUnit: true,
      pptxOptions: { barGrouping: "stacked" }, description: "Composition dans le temps" }),
  N({ id: "pie", label: "Secteurs", icon: "🥧", pptxType: "pie", maxSeries: 1,
      pptxOptions: {}, description: "Répartition d'un total (1 indicateur)" }),
  N({ id: "doughnut", label: "Anneau", icon: "🍩", pptxType: "doughnut", maxSeries: 1,
      pptxOptions: { holeSize: 55 }, description: "Répartition avec centre vide" }),
  N({ id: "scatter", label: "Nuage de points", icon: "⚬", pptxType: "scatter", minPoints: 2,
      pptxOptions: {}, description: "Valeurs par année (axe X numérique)" }),
  N({ id: "radar", label: "Radar", icon: "🕸️", pptxType: "radar", minPoints: 3,
      pptxOptions: { radarStyle: "marker" }, description: "Profil multi-dimensionnel" }),
  N({ id: "combo", label: "Combiné colonnes + courbe", icon: "📊", pptxType: "bar", isCombo: true, minSeries: 2, minPoints: 2,
      pptxOptions: {}, description: "1er indicateur en colonnes, les autres en courbe (2ᵉ axe)" })
];

export const ADVANCED_CHARTS = [
  A({ id: "waterfall", label: "Cascade", icon: "🌊", builder: "waterfallChart", maxSeries: 1, minPoints: 2,
      description: "Niveau initial → variations annuelles → niveau final" }),
  A({ id: "variance", label: "Variation annuelle", icon: "±", builder: "varianceChart", minPoints: 2,
      description: "Δ par rapport à l'année précédente (graphique natif)" }),
  A({ id: "lollipop", label: "Sucette", icon: "🍭", builder: "lollipopChart", maxSeries: 1,
      description: "Valeurs par année, tige + point" }),
  A({ id: "dumbbell", label: "Haltère", icon: "🏋️", builder: "dumbbellChart", minPoints: 2,
      description: "Première vs dernière année, par indicateur" }),
  A({ id: "slope", label: "Pente", icon: "📐", builder: "slopeChart", minPoints: 2,
      description: "Évolution entre deux dates" }),
  A({ id: "tornado", label: "Tornado", icon: "🌪️", builder: "tornadoChart", minSeries: 2, maxSeries: 2,
      description: "Deux indicateurs en miroir par année" }),
  A({ id: "gauge", label: "Jauge", icon: "🎯", builder: "gaugeChart", maxSeries: 1,
      description: "Dernière valeur sur une échelle" }),
  A({ id: "waffle", label: "Gaufre", icon: "🧇", builder: "waffleChart", maxSeries: 1, percentOnly: true,
      description: "Pourcentage en grille 10×10" }),
  A({ id: "kpi_cards", label: "Cartes KPI", icon: "🔢", builder: "kpiCards", maxSeries: 8,
      description: "Dernière valeur + variation, par indicateur" }),
  A({ id: "heatmap", label: "Carte de chaleur", icon: "🟧", builder: "heatmapChart", minPoints: 2,
      description: "Indicateurs × années, intensité par ligne" }),
  A({ id: "small_multiples", label: "Petits multiples", icon: "🔲", builder: "smallMultiples", minPoints: 2, maxSeries: 9,
      description: "Une mini-courbe native par indicateur" }),
  A({ id: "marimekko", label: "Marimekko", icon: "🧱", builder: "marimekkoChart", minSeries: 2, sameUnit: true,
      description: "Largeur = total, hauteur = part (composantes additives)" })
];

export const ALL_CHARTS = [...NATIVE_CHARTS, ...ADVANCED_CHARTS];
export const CHARTS_BY_ID = Object.fromEntries(ALL_CHARTS.map(c => [c.id, c]));

/**
 * Can this chart render the given data shape?
 * @param {object} chart
 * @param {{seriesCount:number, pointCount:number, units:string[]}} shape
 * @returns {{ok:boolean, reason?:string}}
 */
export function checkCompatibility(chart, { seriesCount, pointCount, units = [] }) {
  if (seriesCount < chart.minSeries) return { ok: false, reason: `au moins ${chart.minSeries} indicateur(s)` };
  if (seriesCount > chart.maxSeries) return { ok: false, reason: `au plus ${chart.maxSeries} indicateur(s)` };
  if (pointCount < chart.minPoints) return { ok: false, reason: `au moins ${chart.minPoints} année(s)` };
  const distinct = new Set(units.filter(Boolean));
  if (chart.sameUnit && distinct.size > 1) return { ok: false, reason: "indicateurs de même unité" };
  if (chart.percentOnly && [...distinct].some(u => u !== "%")) return { ok: false, reason: "indicateur en %" };
  return { ok: true };
}

/**
 * Suggest chart types from the selection context.
 *  1 KPI  · 1 year   -> KPI card / gauge / waffle
 *  n KPIs · 1 year   -> KPI cards / bar
 *  1 KPI  · series   -> line with markers / column / waterfall / variance
 *  n KPIs · series, same unit  -> line / stacked
 *  n KPIs · series, mixed units -> small multiples / combo (2) / heatmap
 */
export function suggestChartType(context) {
  const { indicatorCount = 1, isSnapshot = false, units = [] } = context;
  const mixed = new Set(units.filter(Boolean)).size > 1;
  const pick = (...ids) => ({ primary: CHARTS_BY_ID[ids[0]], alternatives: ids.slice(1).map(id => CHARTS_BY_ID[id]) });

  if (indicatorCount <= 1 && isSnapshot) {
    return units[0] === "%" ? pick("kpi_cards", "gauge", "waffle", "column_clustered")
                            : pick("kpi_cards", "gauge", "column_clustered");
  }
  if (indicatorCount > 1 && isSnapshot) return pick("kpi_cards", "bar_clustered", "column_clustered");
  if (indicatorCount <= 1) return pick("line_markers", "column_clustered", "waterfall", "variance", "lollipop", "area");
  if (mixed) {
    return indicatorCount === 2 ? pick("combo", "small_multiples", "slope", "heatmap", "dumbbell")
                                : pick("small_multiples", "heatmap", "slope", "dumbbell");
  }
  return pick("line_markers", "column_clustered", "area_stacked", "slope", "heatmap", "small_multiples");
}

export const CHART_STATS = {
  native: NATIVE_CHARTS.length,
  advanced: ADVANCED_CHARTS.length,
  total: ALL_CHARTS.length
};

export default {
  CHART_GROUPS, NATIVE_CHARTS, ADVANCED_CHARTS, ALL_CHARTS,
  CHARTS_BY_ID, suggestChartType, checkCompatibility, CHART_STATS
};
