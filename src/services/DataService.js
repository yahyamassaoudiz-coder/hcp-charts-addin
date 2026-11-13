/**
 * DataService.js — data.gov.ma CKAN access (v1.2)
 * ================================================
 * Discovery: package_search?q=haut+commissariat+au+plan, then package_show?id=…
 * (as specified), restricted to datasets whose organization is the HCP.
 *
 * Fetch cascade for a mapped indicator:
 *   1. datastore_search on the resource (when the CKAN datastore is active)
 *   2. download the resource through the proxy and parse CSV / XLSX / JSON
 * Rows are returned RAW; geography/year filtering happens in DataNormalizer,
 * against the field names recorded by `npm run map-indicators`.
 *
 * v1.2 fixes: no SQL built from guessed column names (v1.1 always queried
 * "region"/"annee"), XLSX support, real error messages, no data for
 * unmapped indicators instead of silent placeholder requests.
 */

import CacheService from "./CacheService.js";
import Papa from "papaparse";
import { readXlsx } from "../utils/xlsxReader.js";
import { tableFromMatrix } from "../utils/table.js";

const PROXY_BASE = "/api/ckan";
const HCP_ORG_RE = /haut[- ]commissariat[- ]au[- ]plan|^hcp$/i;
const MAX_DATASTORE_ROWS = 32000;

function buildUrl(endpoint, params = {}) {
  const sp = new URLSearchParams({ endpoint });
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) sp.set(k, String(v));
  return `${PROXY_BASE}?${sp.toString()}`;
}

async function ckanFetch(endpoint, params) {
  let response;
  try {
    response = await fetch(buildUrl(endpoint, params), { headers: { Accept: "application/json" } });
  } catch (e) {
    throw new Error("Impossible de joindre le proxy data.gov.ma. Vérifiez votre connexion.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || body.success === false) {
    const msg = body?.error?.message || body?.error || `${response.status} ${response.statusText}`;
    throw new Error(`data.gov.ma (${endpoint}) : ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
  }
  return body.result;
}

export function isHcpDataset(ds) {
  const org = ds.organization || {};
  return HCP_ORG_RE.test(org.title || "") || HCP_ORG_RE.test(org.name || "");
}

// ── Endpoint 1: package_search ──────────────────────────────
export async function discoverHCPDatasets(options = {}) {
  const rows = options.rows || 100;
  const start = options.start || 0;
  const cacheKey = `hcp_datasets_${rows}_${start}`;
  const cached = CacheService.smartGet(cacheKey);
  if (cached) return cached;

  const result = await ckanFetch("package_search", {
    q: "haut commissariat au plan", rows, start, sort: options.sort || "metadata_modified desc"
  });
  const datasets = (result.results || []).filter(isHcpDataset);
  const out = { count: result.count, datasets };
  CacheService.smartSet(cacheKey, out);
  return out;
}

// ── Endpoint 2: package_show ────────────────────────────────
const FORMAT_PRIORITY = { CSV: 1, XLSX: 2, JSON: 3, XLS: 9 };

export async function getDatasetDetails(datasetId) {
  const cacheKey = `dataset_${datasetId}`;
  const cached = CacheService.smartGet(cacheKey);
  if (cached) return cached;

  const ds = await ckanFetch("package_show", { id: datasetId });
  const resources = [...(ds.resources || [])].sort((a, b) =>
    (FORMAT_PRIORITY[(a.format || "").toUpperCase()] || 99) - (FORMAT_PRIORITY[(b.format || "").toUpperCase()] || 99));
  const out = {
    id: ds.id, name: ds.name, title: ds.title, description: ds.notes || "",
    tags: (ds.tags || []).map(t => t.display_name || t.name),
    organization: ds.organization ? ds.organization.title : null,
    resources, bestResource: resources[0] || null,
    datastoreResources: resources.filter(r => r.datastore_active === true),
    lastModified: ds.metadata_modified
  };
  CacheService.smartSet(cacheKey, out);
  return out;
}

// ── Other CKAN endpoints (kept for completeness) ────────────
export async function bulkFetchAllDatasets(options = {}) {
  const all = await ckanFetch("current_package_list_with_resources", { limit: options.limit || 1000, offset: options.offset || 0 });
  const datasets = (all || []).filter(isHcpDataset);
  return { total: (all || []).length, hcpCount: datasets.length, datasets };
}

export async function searchResourcesByFormat(format, options = {}) {
  const result = await ckanFetch("resource_search", { query: `format:${format}`, limit: options.limit || 500, offset: options.offset || 0 });
  return { count: result.count, resources: result.results };
}

export async function getAllMachineReadableResources() {
  const [csv, xlsx, json] = await Promise.all(["csv", "xlsx", "json"].map(f => searchResourcesByFormat(f)));
  return { csv: csv.resources, xlsx: xlsx.resources, json: json.resources,
           totals: { csv: csv.count, xlsx: xlsx.count, json: json.count, all: csv.count + xlsx.count + json.count } };
}

export async function datastoreSearch(resourceId, filters = {}, options = {}) {
  const params = { resource_id: resourceId, limit: options.limit || MAX_DATASTORE_ROWS, offset: options.offset || 0 };
  if (Object.keys(filters).length) params.filters = JSON.stringify(filters);
  if (options.query) params.q = options.query;
  const r = await ckanFetch("datastore_search", params);
  return { fields: r.fields || [], records: r.records || [], total: r.total || 0 };
}

// ── File download & parsing ─────────────────────────────────
function guessFormat(url, contentType, declared) {
  const d = (declared || "").toUpperCase();
  if (["CSV", "XLSX", "XLS", "JSON"].includes(d)) return d;
  const u = url.toLowerCase().split("?")[0];
  if (u.endsWith(".xlsx") || contentType.includes("spreadsheetml")) return "XLSX";
  if (u.endsWith(".xls") || contentType.includes("ms-excel")) return "XLS";
  if (u.endsWith(".json") || contentType.includes("json")) return "JSON";
  return "CSV";
}

function parseCsvText(text) {
  const parsed = Papa.parse(text.replace(/^﻿/, ""), {
    header: false, skipEmptyLines: "greedy", dynamicTyping: false,
    delimitersToGuess: [";", ",", "\t", "|"]
  });
  return tableFromMatrix(parsed.data).rows;
}

/**
 * Download a resource through the proxy and return row objects.
 * @param {string} url
 * @param {{ format?: string, sheet?: string|number, headerRow?: number }} options
 */
export async function downloadAndParse(url, options = {}) {
  const response = await fetch(buildUrl("resource_proxy", { url }));
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(`Téléchargement impossible (${response.status}) : ${body?.error || url}`);
  }
  const contentType = response.headers.get("content-type") || "";
  const format = guessFormat(url, contentType, options.format);

  if (format === "XLS") {
    throw new Error("Ressource au format .xls (Excel 97-2003) non supportée — choisissez une ressource CSV/XLSX dans indicatorMap.json.");
  }
  if (format === "XLSX") {
    const { matrix } = await readXlsx(await response.arrayBuffer(), { sheet: options.sheet });
    return tableFromMatrix(matrix, { headerRow: options.headerRow }).rows;
  }
  if (format === "JSON") {
    const data = await response.json();
    if (Array.isArray(data)) return data;
    return data.data || data.records || data.result?.records || [data];
  }
  return parseCsvText(await response.text());
}

// ── Data source ─────────────────────────────────────────────
// "proxy"  : live CKAN calls through /api/ckan (local dev server)
// "static" : GitHub Pages build — rows come from public/data/<id>.json,
//            written nightly by .github/workflows/pages.yml from data.gov.ma
export function getDataSource() {
  return import.meta.env?.VITE_DATA_SOURCE === "static" ? "static" : "proxy";
}

export async function fetchSnapshot(indicator) {
  const base = import.meta.env?.BASE_URL || "./";
  let response;
  try {
    response = await fetch(`${base}data/${encodeURIComponent(indicator.id)}.json`, { cache: "no-cache" });
  } catch {
    throw new Error("Impossible de charger les données. Vérifiez votre connexion.");
  }
  if (!response.ok) {
    throw new Error(`Pas encore de données pour « ${indicator.label} » — elles arriveront avec la prochaine actualisation nocturne.`);
  }
  const snap = await response.json();
  return { method: "snapshot", records: snap.records || [], fetchedAt: snap.fetchedAt || null, source: snap.source || null };
}

// ── Smart fetch for one mapped indicator ────────────────────
export async function smartFetch(indicator) {
  if (!indicator.mapped) {
    throw new Error(getDataSource() === "static"
      ? `« ${indicator.label} » n'est pas encore disponible (aucune ressource data.gov.ma reliée).`
      : `« ${indicator.label} » n'est pas encore relié à une ressource data.gov.ma (npm run map-indicators).`);
  }
  const cacheKey = `rows_${getDataSource()}_${indicator.id}_${indicator.resourceId || indicator.resourceUrl}_${indicator.sheet || ""}`;
  const cached = CacheService.sessionGet(cacheKey);
  if (cached) return cached;

  if (getDataSource() === "static") {
    const snap = await fetchSnapshot(indicator);
    if (!snap.records.length) throw new Error(`Aucune donnée pour « ${indicator.label} ».`);
    CacheService.sessionSet(cacheKey, snap);
    return snap;
  }

  let result = null;
  const errors = [];

  if (indicator.datastoreActive && indicator.resourceId) {
    try {
      const ds = await datastoreSearch(indicator.resourceId);
      if (ds.records.length) result = { method: "datastore_search", records: ds.records.map(({ _id, ...r }) => r) };
    } catch (e) { errors.push(e.message); }
  }

  if (!result && indicator.resourceUrl) {
    try {
      const rows = await downloadAndParse(indicator.resourceUrl, {
        format: indicator.format, sheet: indicator.sheet, headerRow: indicator.headerRow
      });
      if (rows.length) result = { method: "file_download", records: rows };
    } catch (e) { errors.push(e.message); }
  }

  if (!result) {
    throw new Error(`Aucune donnée pour « ${indicator.label} »${errors.length ? " : " + errors.join(" / ") : "."}`);
  }
  CacheService.sessionSet(cacheKey, result);
  return result;
}

export async function fetchMultipleIndicators(indicators) {
  return Promise.all(indicators.map(async (indicator) => {
    try {
      return { indicator, result: await smartFetch(indicator), error: null };
    } catch (error) {
      return { indicator, result: null, error: error.message };
    }
  }));
}

const DataService = {
  discoverHCPDatasets, getDatasetDetails, bulkFetchAllDatasets,
  searchResourcesByFormat, getAllMachineReadableResources,
  datastoreSearch, smartFetch, fetchMultipleIndicators, downloadAndParse, isHcpDataset,
  getDataSource, fetchSnapshot
};
export default DataService;
