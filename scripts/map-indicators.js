#!/usr/bin/env node
/**
 * map-indicators.js — link the 29 curated KPIs to real data.gov.ma resources (v1.2)
 * ==================================================================================
 *   npm run map-indicators            # discover + inspect + write the map
 *   npm run map-indicators -- --dry   # report only, write nothing
 *
 * 1. package_search?q=haut+commissariat+au+plan (paginated), keep HCP-owned datasets
 * 2. score each dataset against each KPI's keywords
 * 3. download the best CSV/XLSX resource and inspect its columns
 *    (long table: year/region/value columns; wide table: one column per year)
 * 4. write src/constants/indicatorMap.json (read by the add-in) and
 *    src/constants/hcpCatalog.json + docs/MAPPING_REPORT.md (for review)
 *
 * Entries you fix by hand in indicatorMap.json and mark  "locked": true  are
 * never overwritten. Runs on YOUR machine (needs access to data.gov.ma).
 * v1.1 wrote a different file (src/config/indicators.js) the app never imported,
 * filtered on the organisation TITLE instead of its slug, and ran on every build.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { readXlsx } from "../src/utils/xlsxReader.js";
import { tableFromMatrix, YEAR_RE } from "../src/utils/table.js";
import { normKey, normalizeRegion, normalizeValue, extractYear } from "../src/services/DataNormalizer.js";
import { BASE_INDICATORS } from "../src/constants/indicators.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MAP_PATH = path.join(ROOT, "src/constants/indicatorMap.json");
const CATALOG_PATH = path.join(ROOT, "src/constants/hcpCatalog.json");
const REPORT_PATH = path.join(ROOT, "docs/MAPPING_REPORT.md");
const DRY = process.argv.includes("--dry");
const BASES = (process.env.CKAN_BASE ? [process.env.CKAN_BASE] : [])
  .concat(["https://data.gov.ma/data/api/3/action", "https://data.gov.ma/api/3/action"]);
const HCP_RE = /haut[- ]commissariat[- ]au[- ]plan|^hcp$/i;
const MAX_BYTES = 25 * 1024 * 1024;
const UA = "HCP-Charts-Addin/1.2 mapper";

/** Keywords per KPI: `all` must all appear (title/tags/notes), `any` add score, `value` targets the value column. */
const KPI_KEYWORDS = {
  taux_chomage:            { all: ["chomage"], any: ["taux", "activite", "emploi"], value: ["taux de chomage", "chomage"] },
  taux_emploi:             { all: ["emploi"], any: ["taux", "activite"], value: ["taux d emploi", "emploi"] },
  population_active:       { all: ["active"], any: ["population", "activite"], value: ["population active", "actifs"] },
  chomage_urbain:          { all: ["chomage"], any: ["urbain", "milieu"], value: ["urbain"] },
  chomage_rural:           { all: ["chomage"], any: ["rural", "milieu"], value: ["rural"] },
  chomage_jeunes:          { all: ["chomage"], any: ["jeunes", "15 24", "age"], value: ["15 24", "jeunes"] },
  population_totale:       { all: ["population"], any: ["legale", "totale", "recensement", "projection"], value: ["population", "ensemble", "total"] },
  natalite:                { all: ["natalite"], any: ["demograph", "naissance"], value: ["natalite"] },
  mortalite:               { all: ["mortalite"], any: ["demograph", "deces"], value: ["mortalite"] },
  esperance_vie:           { all: ["esperance"], any: ["vie", "naissance"], value: ["esperance"] },
  urbanisation:            { all: ["urbanisation"], any: ["taux", "urbain"], value: ["urbanisation"] },
  pib:                     { all: ["pib"], any: ["produit interieur", "comptes nationaux", "valeur"], value: ["pib", "produit interieur brut"] },
  croissance_pib:          { all: ["pib"], any: ["croissance", "volume", "variation"], value: ["croissance", "variation", "taux"] },
  pib_habitant:            { all: ["pib"], any: ["habitant", "tete"], value: ["habitant", "tete"] },
  investissement_pib:      { all: ["investissement"], any: ["fbcf", "formation brute", "pib"], value: ["investissement", "fbcf"] },
  ipc:                     { all: ["prix"], any: ["indice", "consommation", "ipc"], value: ["ipc", "indice"] },
  inflation:               { all: ["prix"], any: ["inflation", "consommation", "variation"], value: ["inflation", "variation"] },
  inflation_alimentaire:   { all: ["prix"], any: ["alimentaire", "consommation"], value: ["alimentaire"] },
  scolarisation_primaire:  { all: ["scolarisation"], any: ["primaire", "taux"], value: ["primaire", "scolarisation"] },
  abandon_scolaire:        { all: ["abandon"], any: ["scolaire", "decrochage"], value: ["abandon"] },
  medecins:                { all: ["medecin"], any: ["sante", "habitant"], value: ["medecin"] },
  couverture_medicale:     { all: ["couverture"], any: ["medicale", "amo", "sante"], value: ["couverture"] },
  mortalite_infantile:     { all: ["mortalite"], any: ["infantile", "enfant"], value: ["infantile"] },
  production_cerealiere:   { all: ["cereal"], any: ["production", "recolte"], value: ["production", "cereal"] },
  exportations_agricoles:  { all: ["export"], any: ["agricole", "alimentaire"], value: ["agricole", "alimentaire"] },
  indice_production_industrielle: { all: ["production industrielle"], any: ["indice", "ipi"], value: ["indice", "ensemble"] },
  exportations:            { all: ["export"], any: ["commerce exterieur", "echanges"], value: ["export"] },
  importations:            { all: ["import"], any: ["commerce exterieur", "echanges"], value: ["import"] },
  ide:                     { all: ["investissements directs"], any: ["etrangers", "ide"], value: ["ide", "investissements directs"] }
};

// ── HTTP ────────────────────────────────────────────────────
async function getJson(url) {
  const r = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA } });
  if (!(r.headers.get("content-type") || "").includes("json")) throw new Error(`non-JSON response (${r.status})`);
  return r.json();
}

async function findBase() {
  for (const base of BASES) {
    try {
      const j = await getJson(`${base}/package_search?rows=0`);
      if (j && j.success) return base;
    } catch { /* try next */ }
  }
  throw new Error(`CKAN API injoignable (essayé : ${BASES.join(", ")}). Définissez CKAN_BASE si l'URL a changé.`);
}

async function discover(base) {
  const all = new Map();
  for (let start = 0, total = Infinity; start < total && start < 2000; start += 100) {
    const j = await getJson(`${base}/package_search?q=${encodeURIComponent("haut commissariat au plan")}&rows=100&start=${start}`);
    total = j.result.count;
    for (const d of j.result.results) all.set(d.id, d);
    process.stdout.write(`  package_search : ${all.size}/${total}\r`);
    await new Promise(r => setTimeout(r, 300));
  }
  console.log();
  const hcp = [...all.values()].filter(d => HCP_RE.test(d.organization?.title || "") || HCP_RE.test(d.organization?.name || ""));
  return { totalFound: all.size, datasets: hcp.length ? hcp : [...all.values()], orgFiltered: hcp.length > 0 };
}

// ── Scoring ─────────────────────────────────────────────────
function datasetText(d) {
  return {
    title: normKey(d.title + " " + d.name),
    rest: normKey([(d.tags || []).map(t => t.display_name || t.name).join(" "), d.notes || "",
                   (d.resources || []).map(r => r.name || "").join(" ")].join(" "))
  };
}

function scoreDataset(d, kw) {
  const { title, rest } = datasetText(d);
  const has = (k) => title.includes(normKey(k)) ? 3 : rest.includes(normKey(k)) ? 1 : 0;
  if (kw.all.some(k => has(k) === 0)) return 0;
  return kw.all.reduce((s, k) => s + has(k), 0) * 2 + kw.any.reduce((s, k) => s + has(k), 0);
}

const FORMAT_RANK = { CSV: 1, XLSX: 2, JSON: 3 };
function pickResource(d) {
  const res = (d.resources || []).map(r => ({ ...r, F: (r.format || r.url?.split(".").pop() || "").toUpperCase().replace(/^\./, "") }));
  const usable = res.filter(r => FORMAT_RANK[r.F]).sort((a, b) => FORMAT_RANK[a.F] - FORMAT_RANK[b.F]);
  return { best: usable[0] || null, xlsOnly: !usable.length && res.some(r => r.F === "XLS") };
}

// ── Inspection ──────────────────────────────────────────────
async function loadTable(resource, base) {
  if (resource.datastore_active) {
    const j = await getJson(`${base}/datastore_search?resource_id=${encodeURIComponent(resource.id)}&limit=300`);
    const rows = (j.result?.records || []).map(({ _id, ...r }) => r);
    if (rows.length) return { headers: Object.keys(rows[0]), rows };
  }
  const r = await fetch(resource.url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`download ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("file > 25 MB");
  if (resource.F === "XLSX") return tableFromMatrix((await readXlsx(buf)).matrix);
  if (resource.F === "JSON") {
    const j = JSON.parse(buf.toString("utf8"));
    const rows = Array.isArray(j) ? j : (j.data || j.records || []);
    return { headers: Object.keys(rows[0] || {}), rows };
  }
  const parsed = Papa.parse(buf.toString("utf8").replace(/^﻿/, ""), { header: false, skipEmptyLines: "greedy", delimitersToGuess: [";", ",", "\t", "|"] });
  return tableFromMatrix(parsed.data);
}

function bestHeader(headers, terms) {
  let best = null, bestScore = 0;
  for (const h of headers) {
    const k = normKey(h);
    const s = terms.reduce((acc, t) => acc + (k.includes(normKey(t)) ? normKey(t).length : 0), 0);
    if (s > bestScore) { best = h; bestScore = s; }
  }
  return best;
}

function inspect(table, kw) {
  const { headers, rows } = table;
  const sample = rows.slice(0, 300);
  const yearHeaders = headers.filter(h => YEAR_RE.test(h));

  if (yearHeaders.length >= 3) {
    const labelField = headers.find(h => !YEAR_RE.test(h));
    const labels = sample.map(r => r[labelField]).filter(Boolean);
    const regionHits = new Set(labels.map(l => normalizeRegion(l)).filter(r => /-|Oriental/.test(r || "")));
    if (regionHits.size >= 4) {
      return { layout: "wide", rowLabelField: labelField, regionField: labelField, confidence: "medium",
               note: `table large : une ligne par région, ${yearHeaders.length} colonnes année` };
    }
    const match = labels.find(l => kw.value.some(t => normKey(l).includes(normKey(t))));
    return { layout: "wide", rowLabelField: labelField, rowMatch: match ? String(match) : null, regionField: null,
             confidence: match ? "medium" : "low",
             note: match ? `table large, ligne « ${match} »` : "table large : ligne de l'indicateur introuvable — renseignez rowMatch" };
  }

  const yearField = headers.find(h => /ann[eé]e|annee|year|periode|période|date/i.test(h))
    || headers.find(h => sample.filter(r => extractYear(r[h]) !== null && YEAR_RE.test(String(r[h]))).length > sample.length * 0.8);
  const regionField = headers.find(h => /r[ée]gion/i.test(h) && !/milieu/i.test(h)) || null;
  const cityField = headers.find(h => /province|pr[ée]fecture|ville/i.test(h)) || null;
  const numeric = headers.filter(h => h !== yearField &&
    sample.filter(r => normalizeValue(r[h]) !== null).length > sample.length * 0.6);
  const valueField = bestHeader(numeric, kw.value) || (numeric.length === 1 ? numeric[0] : null);
  return {
    layout: "long", yearField: yearField || null, regionField, cityField, valueField,
    confidence: yearField && valueField && bestHeader(numeric, kw.value) ? "high" : (yearField && valueField ? "medium" : "low"),
    note: !yearField ? "colonne année introuvable" : !valueField ? `colonne valeur ambiguë parmi : ${numeric.join(", ")}` : ""
  };
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log("\n  HCP indicator mapper v1.2\n");
  const base = await findBase();
  console.log(`  CKAN : ${base}`);
  const { totalFound, datasets, orgFiltered } = await discover(base);
  console.log(`  ${datasets.length} jeux HCP (sur ${totalFound} résultats${orgFiltered ? "" : " — filtre organisation sans résultat, tous conservés"})\n`);

  const previous = fs.existsSync(MAP_PATH) ? JSON.parse(fs.readFileSync(MAP_PATH, "utf8")) : { indicators: {} };
  const out = {};
  const report = [];

  for (const ind of BASE_INDICATORS) {
    const prev = previous.indicators?.[ind.id];
    if (prev?.locked) { out[ind.id] = prev; report.push([ind.id, "🔒 verrouillé", prev.datasetTitle || "", ""]); continue; }
    const kw = KPI_KEYWORDS[ind.id];
    if (!kw) { report.push([ind.id, "⚠️ pas de mots-clés", "", ""]); continue; }

    const ranked = datasets.map(d => ({ d, s: scoreDataset(d, kw) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
    let entry = null, status = "❌ aucun jeu correspondant", detail = "";
    for (const { d } of ranked.slice(0, 3)) {
      const { best, xlsOnly } = pickResource(d);
      if (!best) { if (xlsOnly) { status = "⚠️ XLS uniquement"; detail = d.title; } continue; }
      try {
        const table = await loadTable(best, base);
        const info = inspect(table, kw);
        entry = {
          datasetId: d.name, datasetTitle: d.title, resourceId: best.id, resourceUrl: best.url,
          format: best.F, datastoreActive: !!best.datastore_active, ...info,
          fieldName: info.valueField || null, lastModified: d.metadata_modified || null, locked: false
        };
        const usable = entry.layout === "wide" ? (entry.regionField || entry.rowMatch) : (entry.yearField && entry.valueField);
        entry.mapped = !!usable;
        status = usable ? (info.confidence === "high" ? "✅" : "🟡 à vérifier") : "🟠 incomplet";
        detail = info.note || "";
        break;
      } catch (e) {
        status = "⚠️ ressource illisible"; detail = `${d.title} : ${e.message}`;
      }
    }
    if (entry) out[ind.id] = entry;
    report.push([ind.id, status, entry?.datasetTitle || "", detail]);
    console.log(`  ${status.padEnd(16)} ${ind.id.padEnd(32)} ${entry?.datasetTitle || detail}`);
  }

  const mappedCount = Object.values(out).filter(e => e.mapped).length;
  console.log(`\n  ${mappedCount}/${BASE_INDICATORS.length} indicateurs utilisables\n`);
  if (DRY) { console.log("  --dry : aucun fichier écrit\n"); return; }

  fs.writeFileSync(MAP_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), ckanBase: base, indicators: out }, null, 2));
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(datasets.map(d => ({
    name: d.name, title: d.title, modified: d.metadata_modified,
    resources: (d.resources || []).map(r => ({ id: r.id, name: r.name, format: r.format, url: r.url, datastore: !!r.datastore_active }))
  })), null, 2));
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, [
    "# Rapport de mappage des indicateurs", "",
    `Généré le ${new Date().toISOString()} — source ${base} — ${datasets.length} jeux HCP.`, "",
    "Corrigez les lignes 🟡/🟠 dans `src/constants/indicatorMap.json` puis mettez `\"locked\": true`.", "",
    "| Indicateur | Statut | Jeu de données | Note |", "|---|---|---|---|",
    ...report.map(r => `| ${r.map(c => String(c).replace(/\|/g, "/")).join(" | ")} |`), ""
  ].join("\n"));
  console.log(`  ✓ ${path.relative(ROOT, MAP_PATH)}\n  ✓ ${path.relative(ROOT, CATALOG_PATH)}\n  ✓ ${path.relative(ROOT, REPORT_PATH)}\n`);
}

export { inspect, scoreDataset, pickResource, KPI_KEYWORDS, getJson, findBase, UA, MAX_BYTES };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error("\n  ❌ " + e.message + "\n"); process.exit(1); });
}
