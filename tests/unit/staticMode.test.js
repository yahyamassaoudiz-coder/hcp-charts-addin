import { describe, it, expect, vi, afterEach } from "vitest";
import { makeXlsx } from "../mocks/makeXlsx.js";
import { CSV_LONG, WIDE_MATRIX } from "../mocks/handlers.js";
import { parseResource, validateRows } from "../../scripts/build-snapshots.js";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

const ind = { id: "taux_chomage", label: "Taux de chômage", unit: "%", mapped: true, layout: "long",
  yearField: "Année", regionField: "Région", valueField: "Taux de chômage (%)" };

describe("GitHub Pages static mode", () => {
  it("DataService reads data/<id>.json instead of the CKAN proxy", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "static");
    const calls = [];
    vi.stubGlobal("fetch", async (url) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ id: ind.id, fetchedAt: "2026-11-13T02:17:00Z", records: [{ "Année": 2020 }] }));
    });
    const { default: DataService } = await import("../../src/services/DataService.js");
    const { default: CacheService } = await import("../../src/services/CacheService.js");
    CacheService.clearAll();
    expect(DataService.getDataSource()).toBe("static");
    const r = await DataService.smartFetch(ind);
    expect(calls).toEqual(["/data/taux_chomage.json"]);
    expect(r).toMatchObject({ method: "snapshot", fetchedAt: "2026-11-13T02:17:00Z" });
  });

  it("missing snapshot gives a clear message", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "static");
    vi.stubGlobal("fetch", async () => new Response("", { status: 404 }));
    const { default: DataService } = await import("../../src/services/DataService.js");
    const { default: CacheService } = await import("../../src/services/CacheService.js");
    CacheService.clearAll();
    await expect(DataService.smartFetch(ind)).rejects.toThrow(/actualisation nocturne/);
  });

  it("indicators without a snapshot are disabled in static builds", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "static");
    const { INDICATORS, MAPPING_META } = await import("../../src/constants/indicators.js");
    expect(MAPPING_META.dataSource).toBe("static");
    expect(INDICATORS.every(i => i.mapped === false)).toBe(true);   // seed index is empty
  });
});

describe("build-snapshots", () => {
  it("parses CSV (with title row) and XLSX like the add-in does", async () => {
    const csv = await parseResource(Buffer.from(CSV_LONG), "CSV");
    expect(csv).toHaveLength(7);
    const xlsx = await parseResource(await makeXlsx(WIDE_MATRIX), "XLSX");
    expect(xlsx[1]["2020"]).toBe(-7.2);
    await expect(parseResource(Buffer.from(""), "XLS")).rejects.toThrow(/xls/);
  });
  it("validates that rows produce chartable points", async () => {
    const rows = await parseResource(Buffer.from(CSV_LONG), "CSV");
    expect(validateRows(rows, ind)).toMatchObject({ ok: true, points: 3, years: "2019–2021" });
    expect(validateRows(rows, { ...ind, valueField: "Inexistant" }).ok).toBe(false);
  });
});
