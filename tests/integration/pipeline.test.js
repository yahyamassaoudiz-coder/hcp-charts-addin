import { describe, it, expect, beforeAll, afterAll } from "vitest";
import JSZip from "jszip";
import { installMockFetch } from "../mocks/handlers.js";
import DataService from "../../src/services/DataService.js";
import DataNormalizer from "../../src/services/DataNormalizer.js";
import ChartEngine from "../../src/services/ChartEngine.js";
import OfficeService from "../../src/services/OfficeService.js";
import CacheService from "../../src/services/CacheService.js";
import { suggestChartType } from "../../src/constants/chartTypes.js";
import { pptState } from "../mocks/setup.js";

let mock;
beforeAll(() => { mock = installMockFetch(); CacheService.clearAll(); });
afterAll(() => mock.restore());

const chomage = { id: "taux_chomage", label: "Taux de chômage", unit: "%", mapped: true, format: "CSV",
  resourceUrl: "https://data.gov.ma/files/chomage.csv", layout: "long",
  yearField: "Année", regionField: "Région", valueField: "Taux de chômage (%)" };
const croissance = { id: "croissance_pib", label: "Croissance PIB", unit: "%", mapped: true, format: "XLSX",
  resourceUrl: "https://data.gov.ma/files/pib.xlsx", layout: "wide", rowLabelField: "Agrégat", rowMatch: "croissance", regionField: null };

describe("fetch → normalize → native chart → insert", () => {
  it("two real-format sources (CSV long + XLSX wide) end up in one inserted slide", async () => {
    const filters = { region: null, startYear: 2019, endYear: 2022 };
    const fetched = await DataService.fetchMultipleIndicators([chomage, croissance]);
    expect(fetched.every(f => !f.error)).toBe(true);

    const norm = DataNormalizer.normalizeMultiSeries(fetched, filters);
    expect(norm.labels).toEqual(["2019", "2020", "2021", "2022"]);
    expect(norm.series[0].data).toEqual([9.2, 11.9, 12.3, null]);
    expect(norm.series[1].data).toEqual([2.9, -7.2, 8.0, 1.3]);

    const chart = suggestChartType({ indicatorCount: 2, isSnapshot: false, units: ["%", "%"] }).primary;
    const b64 = await ChartEngine.buildChart({ chartType: chart, labels: norm.labels, series: norm.series,
      filterParams: { indicators: [chomage, croissance], startYear: 2019, endYear: 2022 } });

    const zip = await JSZip.loadAsync(b64, { base64: true });
    const xml = await zip.file("ppt/charts/chart1.xml").async("string");
    expect(xml).toContain("Taux de chômage");
    expect(xml).toContain('<a:schemeClr val="accent1"/>');

    await OfficeService.initialize();
    const res = await OfficeService.smartInsert(b64);
    expect(res.success).toBe(true);
    expect(pptState.inserts.at(-1).b64).toBe(b64);
  });

  it("regional filter selects exact region rows", async () => {
    const fetched = await DataService.fetchMultipleIndicators([chomage]);
    const norm = DataNormalizer.normalizeMultiSeries(fetched, { region: "Casablanca-Settat", startYear: 2019, endYear: 2021 });
    expect(norm.series[0].data).toEqual([10.1, 12.4, 13.0]);
  });
});
