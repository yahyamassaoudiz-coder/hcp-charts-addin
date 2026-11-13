/**
 * DataNormalizer.js — raw rows -> chart-ready series (v1.2)
 * ==========================================================
 * v1.2 changes:
 *   - Fields are looked up as mapped (exact header, then accent/case-insensitive),
 *     instead of renaming columns first (v1.1 renamed "Année" -> "annee" and then
 *     looked up the original name, so mapped fields were never found).
 *   - "milieu" (urbain/rural) is no longer treated as a region.
 *   - Wide tables (one column per year) are supported: layout = "wide".
 *   - Geography is filtered HERE with exact canonical region matching; without
 *     a region the national row ("Ensemble", "National", "Maroc", ...) is used.
 *   - Duplicate rows per year are resolved (prefer "Ensemble"/"Total") and
 *     reported as warnings instead of silently overwriting.
 */

import { YEAR_RE } from "../utils/table.js";

const MISSING_VALUES = new Set([
  "", "n/a", "na", "n.a.", "-", "--", "---", "...", "..", ".", "null", "none",
  "undefined", "#n/a", "#ref!", "#value!", "#div/0!", "non disponible", "nd", "n.d.", "*"
]);

const REGION_ALIASES = {
  "casablanca": "Casablanca-Settat", "casa": "Casablanca-Settat", "grand casablanca": "Casablanca-Settat",
  "casablanca settat": "Casablanca-Settat",
  "rabat": "Rabat-Salé-Kénitra", "rabat sale kenitra": "Rabat-Salé-Kénitra", "rabat sale zemmour zaer": "Rabat-Salé-Kénitra",
  "tanger": "Tanger-Tétouan-Al Hoceïma", "tanger tetouan al hoceima": "Tanger-Tétouan-Al Hoceïma",
  "fes": "Fès-Meknès", "fes meknes": "Fès-Meknès",
  "marrakech": "Marrakech-Safi", "marrakech safi": "Marrakech-Safi",
  "souss massa": "Souss-Massa", "souss": "Souss-Massa", "agadir": "Souss-Massa",
  "oriental": "Oriental", "l oriental": "Oriental", "oujda": "Oriental",
  "draa tafilalet": "Drâa-Tafilalet", "draa": "Drâa-Tafilalet",
  "beni mellal khenifra": "Béni Mellal-Khénifra", "beni mellal": "Béni Mellal-Khénifra",
  "laayoune sakia el hamra": "Laâyoune-Sakia El Hamra", "laayoune": "Laâyoune-Sakia El Hamra",
  "guelmim oued noun": "Guelmim-Oued Noun", "guelmim": "Guelmim-Oued Noun",
  "dakhla oued ed dahab": "Dakhla-Oued Ed-Dahab", "dakhla oued eddahab": "Dakhla-Oued Ed-Dahab", "dakhla": "Dakhla-Oued Ed-Dahab"
};

const NATIONAL_RE = /\b(national|ensemble|maroc|royaume|total)\b/i;
const AGGREGATE_RE = /\b(ensemble|total|national)\b/i;

/** lowercase, no accents, punctuation -> space */
export function normKey(s) {
  return String(s ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Value of `field` in `row`: exact key, then normalized-key match. */
export function pick(row, field) {
  if (!field || !row) return undefined;
  if (field in row) return row[field];
  const target = normKey(field);
  for (const k of Object.keys(row)) if (normKey(k) === target) return row[k];
  return undefined;
}

export function normalizeValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const str = String(value).trim();
  if (MISSING_VALUES.has(str.toLowerCase())) return null;
  let s = str
    .replace(/[%‰‱]/g, "")
    .replace(/\b(MAD|DH|DHS|USD|EUR)\b/gi, "")
    .replace(/[\s  ]/g, "")
    .replace(/^\((.+)\)$/, "-$1")
    .replace(/[−–]/g, "-");
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return parseFloat(s.replace(/\./g, "").replace(",", "."));   // 1.234,5
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return parseFloat(s.replace(/,/g, ""));                      // 1,234.5
  if (/^-?\d+,\d+$/.test(s)) return parseFloat(s.replace(",", "."));                                         // 12,5
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  return null;
}

export function extractYear(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isInteger(value) && value >= 1900 && value <= 2100) return value;
  const str = String(value).trim();
  const m = str.match(/\b(19|20)\d{2}\b/);
  if (m) return parseInt(m[0], 10);
  if (/^\d{2}$/.test(str)) { const n = parseInt(str, 10); return n >= 60 ? 1900 + n : 2000 + n; }
  return null;
}

export function normalizeRegion(regionName) {
  if (regionName === null || regionName === undefined || String(regionName).trim() === "") return null;
  const key = normKey(String(regionName).replace(/^r[ée]gion( de| du| d')?\s*/i, ""));
  if (REGION_ALIASES[key]) return REGION_ALIASES[key];
  // longest alias contained in the name ("Région de Casablanca-Settat (12)")
  const hit = Object.keys(REGION_ALIASES).filter(a => key.includes(a)).sort((a, b) => b.length - a.length)[0];
  return hit ? REGION_ALIASES[hit] : String(regionName).trim();
}

/** Kept for backward compatibility (no longer renames columns). */
export function normalizeColumnNames(record) {
  const out = {};
  for (const [k, v] of Object.entries(record)) out[String(k).replace(/^﻿/, "").trim()] = v;
  return out;
}

/**
 * Mapping-level transforms (indicatorMap.json):
 *   scale:     multiply every value (e.g. 0.001 for millions DH -> Mrd MAD)
 *   transform: "pct_change" -> year-on-year % change; a year is kept only when
 *              the previous calendar year exists (growth from levels, inflation from CPI)
 */
export function applyTransforms(points, indicator) {
  let out = points;
  if (typeof indicator.scale === "number" && indicator.scale !== 1) {
    out = out.map(p => ({ ...p, value: p.value * indicator.scale }));
  }
  if (indicator.transform === "pct_change") {
    const byYear = new Map(out.map(p => [p.year, p.value]));
    out = out
      .filter(p => byYear.has(p.year - 1) && byYear.get(p.year - 1) !== 0)
      .map(p => ({ ...p, value: (p.value / byYear.get(p.year - 1) - 1) * 100 }));
  }
  if (out !== points) out = out.map(p => ({ ...p, value: Math.round(p.value * 1000) / 1000 }));
  return out;
}

/** Raw rows -> [{year, value, region, row}] according to the indicator mapping. */
export function toLongRecords(records, indicator) {
  const out = [];
  if (indicator.layout === "wide") {
    const yearCols = Object.keys(records[0] || {}).filter(k => YEAR_RE.test(k));
    const rowMatch = indicator.rowMatch ? normKey(indicator.rowMatch) : null;
    for (const row of records) {
      const label = pick(row, indicator.rowLabelField);
      if (rowMatch && !normKey(label).includes(rowMatch)) continue;
      for (const yc of yearCols) {
        out.push({ year: parseInt(yc, 10), value: normalizeValue(row[yc]),
                   region: indicator.regionField ? pick(row, indicator.regionField) : null, row });
      }
    }
    return out;
  }
  const valueField = indicator.valueField || indicator.fieldName;
  for (const row of records) {
    out.push({
      year: extractYear(pick(row, indicator.yearField || "annee")),
      value: normalizeValue(pick(row, valueField)),
      region: indicator.regionField ? pick(row, indicator.regionField) : null,
      city: indicator.cityField ? pick(row, indicator.cityField) : null,
      row
    });
  }
  return out;
}

function matchesFixedFilters(row, fixed) {
  if (!fixed) return true;
  return Object.entries(fixed).every(([col, want]) => normKey(pick(row, col)) === normKey(want));
}

function rowText(row) {
  return Object.values(row || {}).filter(v => typeof v === "string").join(" ");
}

/**
 * Full pipeline for one indicator.
 * @param {object[]} records raw rows
 * @param {object} indicator mapped indicator
 * @param {object} [filters] { region, city, startYear, endYear } — when omitted no geography filter is applied
 * @returns {{ points: {year,value,region,label}[], warnings: string[] }}
 */
export function normalizeDatasetDetailed(records, indicator, filters) {
  const warnings = [];
  if (!Array.isArray(records) || !records.length) return { points: [], warnings };

  let recs = toLongRecords(records.map(normalizeColumnNames), indicator)
    .filter(r => r.year !== null && r.value !== null)
    .filter(r => matchesFixedFilters(r.row, indicator.filters));

  if (filters) {
    const hasRegion = !!indicator.regionField;
    if (filters.region) {
      if (!hasRegion) {
        throw new Error(`« ${indicator.label} » n'est publié qu'au niveau national — retirez le filtre de région.`);
      }
      recs = recs.filter(r => normalizeRegion(r.region) === filters.region);
      if (filters.city) {
        if (indicator.cityField) {
          const c = normKey(filters.city);
          recs = recs.filter(r => normKey(r.city).includes(c));
        } else {
          warnings.push(`« ${indicator.label} » : pas de découpage par province, niveau régional utilisé.`);
        }
      }
    } else if (hasRegion) {
      const national = recs.filter(r => r.region === null || String(r.region).trim() === "" || NATIONAL_RE.test(String(r.region)));
      if (national.length) recs = national;
      else if (new Set(recs.map(r => normKey(r.region))).size > 1) {
        throw new Error(`« ${indicator.label} » : pas de ligne nationale dans la source — choisissez une région.`);
      }
    }
  }

  const byYear = new Map();
  let dupes = 0;
  for (const r of recs) {
    const prev = byYear.get(r.year);
    if (!prev) { byYear.set(r.year, r); continue; }
    dupes++;
    if (!AGGREGATE_RE.test(rowText(prev.row)) && AGGREGATE_RE.test(rowText(r.row))) byYear.set(r.year, r);
  }
  if (dupes) warnings.push(`« ${indicator.label} » : plusieurs lignes par année (${dupes}) — ligne « Ensemble/Total » retenue. Précisez "filters" dans indicatorMap.json si besoin.`);

  let points = [...byYear.values()]
    .sort((a, b) => a.year - b.year)
    .map(r => ({ year: r.year, value: r.value, region: normalizeRegion(r.region), label: String(r.year), raw: r.row }));

  points = applyTransforms(points, indicator);

  // year range applied AFTER transforms, so a % change can use the year before the range
  if (filters?.startYear) points = points.filter(p => p.year >= parseInt(filters.startYear, 10));
  if (filters?.endYear) points = points.filter(p => p.year <= parseInt(filters.endYear, 10));
  return { points, warnings };
}

/** Backward-compatible: returns the points array only. */
export function normalizeDataset(records, indicator, filters) {
  return normalizeDatasetDetailed(records, indicator, filters).points;
}

/**
 * Several indicators -> aligned series on a shared year axis.
 * @returns {{ labels: string[], series: {name, unit, data}[], warnings: string[], errors: {indicator, error}[] }}
 */
export function normalizeMultiSeries(fetchResults, filters) {
  const allYears = new Set();
  const seriesData = [];
  const warnings = [];
  const errors = [];

  for (const { indicator: base, result } of fetchResults) {
    if (!result || !result.records) continue;
    const indicator = result.mapping ? { ...base, ...result.mapping } : base;
    try {
      const { points, warnings: w } = normalizeDatasetDetailed(result.records, indicator, filters);
      warnings.push(...w);
      if (!points.length) { errors.push({ indicator, error: "aucune valeur pour ces filtres" }); continue; }
      const map = {};
      for (const p of points) { map[p.year] = p.value; allYears.add(p.year); }
      seriesData.push({ name: indicator.label, unit: indicator.unit, map });
    } catch (e) {
      errors.push({ indicator, error: e.message });
    }
  }

  const years = [...allYears].sort((a, b) => a - b);
  return {
    labels: years.map(String),
    series: seriesData.map(s => ({ name: s.name, unit: s.unit, data: years.map(y => (y in s.map ? s.map[y] : null)) })),
    warnings,
    errors
  };
}

const DataNormalizer = {
  normalizeValue, extractYear, normalizeRegion, normalizeColumnNames, normKey, pick,
  toLongRecords, normalizeDataset, normalizeDatasetDetailed, normalizeMultiSeries, applyTransforms
};
export default DataNormalizer;
