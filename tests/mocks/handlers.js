/**
 * handlers.js — fetch mock for /api/ckan (v1.2): package_search / package_show /
 * datastore_search and resource_proxy serving a CSV (long) and an XLSX (wide).
 */
import { makeXlsx } from "./makeXlsx.js";

export const CSV_LONG = [
  "Taux de chômage par région (HCP)",                 // title row -> header detection
  "Année;Région;Taux de chômage (%);Milieu",
  "2019;Ensemble national;9,2;Ensemble",
  "2020;Ensemble national;11,9;Ensemble",
  "2021;Ensemble national;12,3;Ensemble",
  "2019;Casablanca-Settat;10,1;Ensemble",
  "2020;Casablanca-Settat;12,4;Ensemble",
  "2021;Casablanca-Settat;13,0;Ensemble",
  "2021;Casablanca-Settat;9,9;Urbain"
].join("\n");

export const WIDE_MATRIX = [
  ["Comptes nationaux — PIB (Mrd MAD)"],
  [],
  ["Agrégat", 2019, 2020, 2021, 2022],
  ["PIB aux prix courants", 1239.8, 1152.5, 1274.7, 1330.2],
  ["Croissance en volume (%)", 2.9, -7.2, 8.0, 1.3]
];

export const MOCK_DATASETS = [{
  id: "ds-chomage", name: "taux-de-chomage-regional", title: "Taux de chômage par région",
  organization: { name: "haut-commissariat-au-plan", title: "Haut-Commissariat au Plan" },
  resources: [{ id: "res-chomage", url: "https://data.gov.ma/files/chomage.csv", format: "CSV", datastore_active: false }]
}, {
  id: "ds-pib", name: "comptes-nationaux-pib", title: "Comptes nationaux — PIB",
  organization: { name: "haut-commissariat-au-plan", title: "Haut-Commissariat au Plan" },
  resources: [{ id: "res-pib", url: "https://data.gov.ma/files/pib.xlsx", format: "XLSX", datastore_active: false }]
}, {
  id: "ds-other", name: "autre", title: "Jeu d'une autre organisation",
  organization: { name: "autre", title: "Autre ministère" }, resources: []
}];

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export function installMockFetch() {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input), "http://localhost");
    calls.push(url.toString());
    if (url.pathname !== "/api/ckan") return new Response("not found", { status: 404 });
    const p = url.searchParams;
    switch (p.get("endpoint")) {
      case "package_search":
        return json({ success: true, result: { count: MOCK_DATASETS.length, results: MOCK_DATASETS } });
      case "package_show": {
        const ds = MOCK_DATASETS.find(d => d.id === p.get("id") || d.name === p.get("id"));
        return ds ? json({ success: true, result: ds }) : json({ success: false, error: { message: "Not found" } }, 404);
      }
      case "resource_proxy": {
        const target = p.get("url");
        if (target.endsWith(".csv")) return new Response(CSV_LONG, { headers: { "Content-Type": "text/csv" } });
        if (target.endsWith(".xlsx")) return new Response(await makeXlsx(WIDE_MATRIX), {
          headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } });
        return json({ success: false, error: "404" }, 404);
      }
      default:
        return json({ success: false, error: "unknown endpoint" }, 400);
    }
  };
  return { restore: () => { globalThis.fetch = original; }, calls };
}
