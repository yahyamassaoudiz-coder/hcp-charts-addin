import { describe, it, expect } from "vitest";
import { inspect, scoreDataset, pickResource, KPI_KEYWORDS } from "../../scripts/map-indicators.js";
import { BASE_INDICATORS } from "../../src/constants/indicators.js";

describe("map-indicators", () => {
  it("has keywords for all 29 curated KPIs", () => {
    expect(BASE_INDICATORS).toHaveLength(29);
    for (const ind of BASE_INDICATORS) expect(KPI_KEYWORDS[ind.id], ind.id).toBeTruthy();
  });
  it("scores datasets by title/tags", () => {
    const d = { title: "Taux de chômage selon le milieu", name: "chomage", tags: [], notes: "", resources: [] };
    expect(scoreDataset(d, KPI_KEYWORDS.taux_chomage)).toBeGreaterThan(0);
    expect(scoreDataset(d, KPI_KEYWORDS.pib)).toBe(0);
  });
  it("prefers CSV/XLSX and flags XLS-only", () => {
    expect(pickResource({ resources: [{ format: "XLS" }, { format: "xlsx", url: "a.xlsx" }] }).best.F).toBe("XLSX");
    expect(pickResource({ resources: [{ format: "XLS" }] }).xlsOnly).toBe(true);
  });
  it("detects long tables", () => {
    const t = { headers: ["Année", "Région", "Milieu", "Taux de chômage (%)"],
      rows: [{ "Année": "2020", "Région": "Oriental", Milieu: "Urbain", "Taux de chômage (%)": "12,5" }] };
    expect(inspect(t, KPI_KEYWORDS.taux_chomage)).toMatchObject({ layout: "long", yearField: "Année", regionField: "Région", valueField: "Taux de chômage (%)", confidence: "high" });
  });
  it("detects wide tables (by indicator row and by region rows)", () => {
    const t = { headers: ["Agrégat", "2019", "2020", "2021"],
      rows: [{ "Agrégat": "PIB courant", "2019": 1 }, { "Agrégat": "Croissance du PIB en volume", "2019": 2 }] };
    expect(inspect(t, KPI_KEYWORDS.croissance_pib)).toMatchObject({ layout: "wide", rowMatch: "Croissance du PIB en volume" });
    const r = { headers: ["Région", "2019", "2020", "2021"], rows: ["Oriental", "Fès-Meknès", "Souss-Massa", "Marrakech-Safi"].map(x => ({ "Région": x })) };
    expect(inspect(r, KPI_KEYWORDS.taux_chomage)).toMatchObject({ layout: "wide", regionField: "Région" });
  });
});
