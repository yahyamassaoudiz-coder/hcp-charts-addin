import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import ChartEngine from "../../src/services/ChartEngine.js";
import { ALL_CHARTS, checkCompatibility } from "../../src/constants/chartTypes.js";

const labels = ["2018", "2019", "2020", "2021", "2022"];
const S = {
  pct: { name: "Taux de chômage", unit: "%", data: [9.5, 9.2, 11.9, 12.3, null] },
  pct2: { name: "Taux d'activité", unit: "%", data: [46.0, 45.8, 44.8, 45.3, 44.3] },
  mad: { name: "Exportations", unit: "Mrd MAD", data: [275, 284, 263, 330, 428] },
  mad2: { name: "Importations", unit: "Mrd MAD", data: [480, 491, 422, 526, 737] },
  neg: { name: "Croissance PIB", unit: "%", data: [3.1, 2.9, -7.2, 8.0, 1.3] }
};

function seriesFor(chart) {
  if (chart.percentOnly) return [S.pct];
  if (chart.sameUnit && chart.minSeries >= 2) return [S.mad, S.mad2];
  if (chart.minSeries >= 2) return chart.maxSeries === 2 ? [S.pct, S.pct2] : [S.pct, S.mad];
  if (chart.maxSeries === 1) return [S.neg];
  return [S.pct, S.pct2, S.mad];
}

async function parts(b64) {
  const zip = await JSZip.loadAsync(b64, { base64: true });
  const names = Object.keys(zip.files);
  const read = async (re) => (await Promise.all(names.filter(n => re.test(n)).map(n => zip.file(n).async("string")))).join("");
  return { names, charts: await read(/charts\/chart\d+\.xml$/), slides: await read(/slides\/slide\d+\.xml$/) };
}

const filterParams = { indicators: [{ label: "Taux de chômage", unit: "%" }], region: null, startYear: 2018, endYear: 2022 };

describe("ChartEngine — every chart type renders", () => {
  for (const chart of ALL_CHARTS) {
    it(`${chart.id}`, async () => {
      const series = seriesFor(chart);
      expect(checkCompatibility(chart, { seriesCount: series.length, pointCount: labels.length, units: series.map(s => s.unit) }).ok).toBe(true);
      const b64 = await ChartEngine.buildChart({ chartType: chart.id, labels, series, filterParams });
      const { names, charts, slides } = await parts(b64);
      expect(names).toContain("ppt/slides/slide1.xml");
      if (chart.group === "native") expect(names.some(n => /charts\/chart\d+\.xml$/.test(n))).toBe(true);
      // theme-driven: no hardcoded Arial/Calibri and accent references present
      expect(charts + slides).not.toMatch(/typeface="(Arial|Calibri)"/);
      expect(charts + slides).toMatch(/schemeClr val="accent\d"/);
    });
  }
});

describe("ChartEngine — details", () => {
  it("keeps gaps as blanks, not zeros", async () => {
    const { charts } = await parts(await ChartEngine.buildChart({ chartType: "line", labels, series: [S.pct], filterParams }));
    expect(charts).toContain('<c:dispBlanksAs val="gap"/>');
    expect(charts).not.toMatch(/<c:pt idx="4"><c:v>0<\/c:v>/);
  });
  it("combo puts lines on a secondary axis", async () => {
    const { charts } = await parts(await ChartEngine.buildChart({ chartType: "combo", labels, series: [S.mad, S.pct], filterParams }));
    expect(charts).toContain("<c:barChart>");
    expect(charts).toContain("<c:lineChart>");
    expect((charts.match(/<c:valAx>/g) || []).length).toBe(2);
  });
  it("gauge hides its lower half with noFill (no white mask rectangle)", async () => {
    const { charts } = await parts(await ChartEngine.buildChart({ chartType: "gauge", labels, series: [S.pct], filterParams }));
    expect(charts).toContain("<a:noFill/>");
  });
  it("throws on empty data and on incompatible shapes", async () => {
    await expect(ChartEngine.buildChart({ chartType: "line", labels: [], series: [], filterParams: {} })).rejects.toThrow();
    await expect(ChartEngine.buildChart({ chartType: "waffle", labels, series: [S.mad], filterParams })).rejects.toThrow(/%/);
    await expect(ChartEngine.buildChart({ chartType: "tornado", labels, series: [S.pct], filterParams })).rejects.toThrow(/2/);
  });
});

describe("SvgChart (web version)", async () => {
  const { renderSvg, pickForm } = await import("../../src/services/SvgChart.js");
  const { CHARTS_BY_ID } = await import("../../src/constants/chartTypes.js");
  const allLabels = { title: "Taux de chômage — Oriental", subtitle: "2018–2022 • Unité : %", sourceNote: "Source : HCP — data.gov.ma" };
  it("picks one axis only: mixed units become panels", () => {
    expect(pickForm(CHARTS_BY_ID.line, [S.pct, S.pct2], labels)).toBe("line");
    expect(pickForm(CHARTS_BY_ID.combo, [S.mad, S.pct], labels)).toBe("panels");
    expect(pickForm(CHARTS_BY_ID.column_clustered, [S.pct], labels)).toBe("column");
    expect(pickForm(CHARTS_BY_ID.kpi_cards, [S.pct], ["2022"])).toBe("column");
  });
  it("renders PowerPoint-friendly SVG for every chart type", () => {
    for (const c of ALL_CHARTS) {
      const { svg } = renderSvg({ chartConfig: c, labels, series: seriesFor(c), allLabels });
      expect(svg.startsWith("<svg xmlns=")).toBe(true);
      expect(svg).not.toMatch(/NaN|undefined|<style|class=|var\(/);
      expect(svg).toContain("Taux de chômage — Oriental");
    }
  });
  it("breaks lines at gaps and escapes text", () => {
    const { svg, simplified } = renderSvg({ chartConfig: CHARTS_BY_ID.line, labels,
      series: [{ name: "A & <B>", unit: "%", data: [1, null, 3, 4, 5] }], allLabels });
    expect(svg).toContain("A &amp; &lt;B&gt;");
    expect((svg.match(/<path d="M[^"]*"/)[0].match(/M/g) || []).length).toBe(2);
    expect(simplified).toBe(false);
  });
});
