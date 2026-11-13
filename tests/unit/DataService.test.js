import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { installMockFetch } from "../mocks/handlers.js";
import DataService from "../../src/services/DataService.js";
import CacheService from "../../src/services/CacheService.js";

let mock;
beforeEach(() => { mock = installMockFetch(); CacheService.clearAll(); });
afterEach(() => mock.restore());

describe("DataService", () => {
  it("discovers with q=haut+commissariat+au+plan and keeps HCP-owned datasets only", async () => {
    const r = await DataService.discoverHCPDatasets();
    expect(mock.calls[0]).toContain("q=haut+commissariat+au+plan");
    expect(r.datasets.map(d => d.id)).toEqual(["ds-chomage", "ds-pib"]);
  });
  it("package_show sorts CSV/XLSX first", async () => {
    const d = await DataService.getDatasetDetails("ds-pib");
    expect(d.bestResource.format).toBe("XLSX");
  });
  it("downloads CSV with a title row through the proxy", async () => {
    const rows = await DataService.downloadAndParse("https://data.gov.ma/files/chomage.csv");
    expect(Object.keys(rows[0])).toEqual(["Année", "Région", "Taux de chômage (%)", "Milieu"]);
    expect(rows).toHaveLength(7);
  });
  it("downloads XLSX", async () => {
    const rows = await DataService.downloadAndParse("https://data.gov.ma/files/pib.xlsx");
    expect(rows[0]["Agrégat"]).toBe("PIB aux prix courants");
  });
  it("refuses unmapped indicators with an actionable message", async () => {
    await expect(DataService.smartFetch({ label: "X", mapped: false })).rejects.toThrow(/map-indicators/);
  });
});
