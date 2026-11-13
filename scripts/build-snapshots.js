#!/usr/bin/env node
/**
 * build-snapshots.js — pull every mapped indicator from data.gov.ma into
 * public/data/<id>.json (runs nightly in GitHub Actions, see .github/workflows/pages.yml)
 * ===================================================================================
 * For each indicator in src/constants/indicatorMap.json with mapped=true:
 *   1. read the rows (CKAN datastore_search if active, else download CSV/XLSX/JSON)
 *   2. check they normalise to at least one (year, value) point
 *   3. write public/data/<id>.json  { id, fetchedAt, source, records }
 * If a download fails, the previous snapshot (committed in the repo) is KEPT and
 * flagged as stale, so one bad night never empties the add-in.
 *
 * Writes src/constants/snapshotIndex.json (read by the add-in to enable/disable
 * indicators) and a Markdown summary to $GITHUB_STEP_SUMMARY when present.
 *
 *   npm run snapshots          # after npm run map-indicators
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { readXlsx } from "../src/utils/xlsxReader.js";
import { tableFromMatrix } from "../src/utils/table.js";
import { normalizeDatasetDetailed } from "../src/services/DataNormalizer.js";
import { BASE_INDICATORS } from "../src/constants/indicators.js";
import { getJson, findBase, UA, MAX_BYTES } from "./map-indicators.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_PATH = path.join(ROOT, "src/constants/indicatorMap.json");
const INDEX_PATH = path.join(ROOT, "src/constants/snapshotIndex.json");
const DATA_DIR = path.join(ROOT, "public/data");
const DATASTORE_PAGE = 5000;
const DATASTORE_MAX = 50000;

/** Raw file bytes -> row objects (same parsing as the add-in). */
export async function parseResource(buf, format, { sheet, headerRow } = {}) {
  const F = (format || "").toUpperCase();
  if (F === "XLS") throw new Error(".xls (Excel 97-2003) non supporté");
  if (F === "XLSX") return tableFromMatrix((await readXlsx(buf, { sheet })).matrix, { headerRow }).rows;
  if (F === "JSON") {
    const j = JSON.parse(Buffer.from(buf).toString("utf8"));
    return Array.isArray(j) ? j : (j.data || j.records || j.result?.records || []);
  }
  const parsed = Papa.parse(Buffer.from(buf).toString("utf8").replace(/^﻿/, ""), {
    header: false, skipEmptyLines: "greedy", delimitersToGuess: [";", ",", "\t", "|"]
  });
  return tableFromMatrix(parsed.data, { headerRow }).rows;
}

async function fetchRows(ind, base) {
  if (ind.datastoreActive && ind.resourceId) {
    const rows = [];
    for (let offset = 0; offset < DATASTORE_MAX; offset += DATASTORE_PAGE) {
      const j = await getJson(`${base}/datastore_search?resource_id=${encodeURIComponent(ind.resourceId)}&limit=${DATASTORE_PAGE}&offset=${offset}`);
      const page = (j.result?.records || []).map(({ _id, ...r }) => r);
      rows.push(...page);
      if (page.length < DATASTORE_PAGE) break;
    }
    if (rows.length) return { method: "datastore_search", rows };
  }
  if (!ind.resourceUrl) throw new Error("aucune URL de ressource");
  const r = await fetch(ind.resourceUrl, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!r.ok) throw new Error(`téléchargement ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("fichier > 25 Mo");
  return { method: "file_download", rows: await parseResource(buf, ind.format, ind) };
}

/** Does this snapshot actually yield chartable points? */
export function validateRows(rows, indicator) {
  try {
    const { points, warnings } = normalizeDatasetDetailed(rows, indicator, {});
    const years = points.map(p => p.year);
    return { ok: points.length > 0, points: points.length,
             years: years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "", warnings };
  } catch (e) {
    // a national-only check can throw; rows still exist, regional use may work
    return { ok: rows.length > 0, points: 0, years: "", warnings: [e.message] };
  }
}

/** public/data/status.json — read by the landing page (index.html). */
export function writeStatus(generatedAt, index, map) {
  const indicators = BASE_INDICATORS.map(b => ({
    id: b.id, label: b.label, mapped: !!map[b.id]?.mapped,
    pendingReview: !!index[b.id]?.pendingReview,
    ok: !!index[b.id]?.ok, stale: !!index[b.id]?.stale, years: index[b.id]?.years || ""
  }));
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, "status.json"), JSON.stringify({
    generatedAt, total: indicators.length, available: indicators.filter(i => i.ok).length, indicators
  }, null, 2) + "\n");
}

async function main() {
  const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8")).indicators || {};
  const prevIndex = fs.existsSync(INDEX_PATH) ? JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")).indicators || {} : {};
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const base = await findBase();
  const now = new Date().toISOString();
  const index = {};
  const lines = [];

  for (const baseInd of BASE_INDICATORS) {
    const m = map[baseInd.id];
    const ind = { ...baseInd, ...(m || {}) };
    const file = path.join(DATA_DIR, `${baseInd.id}.json`);

    if (!m?.mapped) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
      lines.push([baseInd.label, "⚪ non relié", "", ""]);
      continue;
    }
    // Only publish what is certain: automatic matches below "high" confidence
    // (e.g. "Chômage urbain" matched to an all-areas table) wait for a human
    // to check the entry and set "locked": true in indicatorMap.json.
    if (!m.locked && m.confidence !== "high") {
      if (fs.existsSync(file)) fs.unlinkSync(file);
      index[baseInd.id] = { ok: false, pendingReview: true };
      lines.push([baseInd.label, "🟡 à valider", "", `${m.datasetTitle || ""} — vérifiez puis "locked": true`]);
      continue;
    }
    try {
      const { method, rows } = await fetchRows(ind, base);
      const v = validateRows(rows, ind);
      if (!v.ok) throw new Error(`aucun point exploitable (${v.warnings[0] || "vérifiez yearField/valueField"})`);
      fs.writeFileSync(file, JSON.stringify({
        id: baseInd.id, fetchedAt: now,
        source: { datasetId: m.datasetId, datasetTitle: m.datasetTitle, resourceUrl: m.resourceUrl, lastModified: m.lastModified, method },
        records: rows
      }));
      index[baseInd.id] = { ok: true, fetchedAt: now, rows: rows.length, years: v.years, stale: false };
      lines.push([baseInd.label, "✅", v.years, `${rows.length} lignes${v.warnings.length ? " — " + v.warnings[0] : ""}`]);
    } catch (e) {
      const prev = prevIndex[baseInd.id];
      if (prev?.ok && fs.existsSync(file)) {
        index[baseInd.id] = { ...prev, stale: true, lastError: e.message };
        lines.push([baseInd.label, "🟡 ancienne copie conservée", prev.years || "", e.message]);
      } else {
        index[baseInd.id] = { ok: false, lastError: e.message };
        lines.push([baseInd.label, "❌", "", e.message]);
      }
    }
    console.log(`  ${lines.at(-1)[1].padEnd(28)} ${baseInd.id}`);
    await new Promise(r => setTimeout(r, 250));   // be polite to data.gov.ma
  }

  fs.writeFileSync(INDEX_PATH, JSON.stringify({ generatedAt: now, ckanBase: base, indicators: index }, null, 2) + "\n");
  writeStatus(now, index, map);
  const okCount = Object.values(index).filter(i => i.ok).length;
  console.log(`\n  ${okCount}/${BASE_INDICATORS.length} indicateurs disponibles`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
      `## Données HCP — ${okCount}/${BASE_INDICATORS.length} indicateurs disponibles`, "",
      `Source : ${base} · ${now}`, "",
      "Corrigez les ❌ / ⚪ dans `src/constants/indicatorMap.json` (voir `docs/MAPPING_REPORT.md`), mettez `\"locked\": true`, puis poussez sur `main`.", "",
      "| Indicateur | Statut | Années | Détail |", "|---|---|---|---|",
      ...lines.map(l => `| ${l.map(c => String(c).replace(/\|/g, "/")).join(" | ")} |`), ""
    ].join("\n"));
  }
}

if (process.argv.includes("--status-only")) {
  writeStatus(null, {}, {});
} else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error("\n  ❌ " + e.message + "\n"); process.exit(1); });
}
