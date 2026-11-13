import { describe, it, expect } from "vitest";
import {
  normalizeValue, extractYear, normalizeRegion, pick,
  normalizeDataset, normalizeDatasetDetailed, normalizeMultiSeries
} from "../../src/services/DataNormalizer.js";

const LONG = { id: "taux_chomage", label: "Taux de chômage", unit: "%", layout: "long",
  yearField: "Année", regionField: "Région", valueField: "Taux de chômage (%)" };
const rows = [
  { "Année": "2019", "Région": "Ensemble national", "Taux de chômage (%)": "9,2", Milieu: "Ensemble" },
  { "Année": "2020", "Région": "Ensemble national", "Taux de chômage (%)": "11,9", Milieu: "Ensemble" },
  { "Année": "2020", "Région": "Casablanca-Settat", "Taux de chômage (%)": "12,4", Milieu: "Ensemble" },
  { "Année": "2020", "Région": "Casablanca-Settat", "Taux de chômage (%)": "9,9", Milieu: "Urbain" }
];

describe("value parsing", () => {
  it("handles French / English / thousands formats", () => {
    expect(normalizeValue("12,5")).toBe(12.5);
    expect(normalizeValue("1.234,56")).toBe(1234.56);
    expect(normalizeValue("1,234.5")).toBe(1234.5);
    expect(normalizeValue("1 234,5")).toBe(1234.5);
    expect(normalizeValue("3.14")).toBe(3.14);
    expect(normalizeValue("(2,5)")).toBe(-2.5);
    expect(normalizeValue("12,5 %")).toBe(12.5);
    expect(normalizeValue("N/A")).toBeNull();
    expect(normalizeValue("Casablanca")).toBeNull();
    expect(normalizeValue(7)).toBe(7);
  });
  it("extracts years", () => {
    expect(extractYear("T1 2023")).toBe(2023);
    expect(extractYear(2021)).toBe(2021);
    expect(extractYear("abc")).toBeNull();
  });
  it("normalizes regions without matching 'milieu'", () => {
    expect(normalizeRegion("Région de Casablanca-Settat")).toBe("Casablanca-Settat");
    expect(normalizeRegion("FES MEKNES")).toBe("Fès-Meknès");
    expect(normalizeRegion("Urbain")).toBe("Urbain");
  });
  it("picks fields by exact or accent-insensitive header", () => {
    expect(pick({ "Année": 2020 }, "annee")).toBe(2020);
    expect(pick({ "Année": 2020 }, "Année")).toBe(2020);
  });
});

describe("normalizeDataset", () => {
  it("uses the national row when no region is selected", () => {
    const pts = normalizeDataset(rows, LONG, { startYear: 2015, endYear: 2024 });
    expect(pts.map(p => [p.year, p.value])).toEqual([[2019, 9.2], [2020, 11.9]]);
  });
  it("filters an exact region and prefers the 'Ensemble' row on duplicates", () => {
    const { points, warnings } = normalizeDatasetDetailed(rows, LONG, { region: "Casablanca-Settat" });
    expect(points).toEqual([expect.objectContaining({ year: 2020, value: 12.4 })]);
    expect(warnings.length).toBe(1);
  });
  it("honours fixed filters from the mapping", () => {
    const pts = normalizeDataset(rows, { ...LONG, filters: { Milieu: "Urbain" } }, { region: "Casablanca-Settat" });
    expect(pts[0].value).toBe(9.9);
  });
  it("refuses a region filter on a national-only indicator", () => {
    expect(() => normalizeDataset(rows, { ...LONG, regionField: null, label: "PIB" }, { region: "Oriental" }))
      .toThrow(/national/);
  });
  it("reads wide tables (one column per year)", () => {
    const wide = [
      { "Agrégat": "PIB aux prix courants", "2019": 1239.8, "2020": 1152.5 },
      { "Agrégat": "Croissance en volume (%)", "2019": 2.9, "2020": -7.2 }
    ];
    const ind = { label: "Croissance", layout: "wide", rowLabelField: "Agrégat", rowMatch: "croissance", regionField: null };
    expect(normalizeDataset(wide, ind, {}).map(p => p.value)).toEqual([2.9, -7.2]);
  });
});

describe("normalizeMultiSeries", () => {
  it("aligns series, keeps gaps as null and reports per-indicator errors", () => {
    const a = { ...LONG, id: "a", label: "A" };
    const b = { ...LONG, id: "b", label: "B", regionField: null };
    const res = normalizeMultiSeries([
      { indicator: a, result: { records: rows } },
      { indicator: b, result: { records: [{ "Année": 2020, "Taux de chômage (%)": 5 }] } }
    ], {});
    expect(res.labels).toEqual(["2019", "2020"]);
    expect(res.series[0].data).toEqual([9.2, 11.9]);
    expect(res.series[1].data).toEqual([null, 5]);
    const err = normalizeMultiSeries([{ indicator: { ...b, label: "B" }, result: { records: rows } }], { region: "Oriental" });
    expect(err.series).toHaveLength(0);
    expect(err.errors[0].error).toMatch(/national/);
  });
});

describe("transforms (v1.3)", () => {
  const wide = [
    { "Opérations": "Produit intérieur brut", "2021": 1276563, "2022": 1333539, "2023": 1485635 },
    { "Opérations": "Activités primaires", "2021": 152906, "2022": 130636, "2023": 169274 }
  ];
  const base = { label: "PIB", layout: "wide", rowLabelField: "Opérations", regionField: null, filters: { "Opérations": "Produit intérieur brut" } };
  it("scales millions DH to Mrd MAD", () => {
    expect(normalizeDataset(wide, { ...base, scale: 0.001 }, {}).map(p => p.value)).toEqual([1276.563, 1333.539, 1485.635]);
  });
  it("computes year-on-year % change, using the year before the selected range", () => {
    const pts = normalizeDataset(wide, { ...base, transform: "pct_change" }, { startYear: 2022, endYear: 2023 });
    expect(pts.map(p => p.year)).toEqual([2022, 2023]);
    expect(pts[0].value).toBeCloseTo(4.463, 3);
    expect(pts[1].value).toBeCloseTo(11.405, 3);
  });
  it("wide tables with several dimension columns use exact filters", () => {
    const rows = [
      { Milieu: "National", "Région": "Ensemble", Sexe: "Total", "2024": 13.3 },
      { Milieu: "National", "Région": "Ensemble", Sexe: "Féminin", "2024": 19.4 },
      { Milieu: "Urbain", "Région": "Oriental", Sexe: "Total", "2024": 25 }
    ];
    const ind = { label: "Chômage", layout: "wide", regionField: "Région", filters: { Milieu: "National", Sexe: "Total" } };
    expect(normalizeDataset(rows, ind, {}).map(p => p.value)).toEqual([13.3]);
    expect(normalizeDataset(rows, { ...ind, filters: { Milieu: "Urbain", Sexe: "Total" } }, { region: "Oriental" }).map(p => p.value)).toEqual([25]);
  });
});
