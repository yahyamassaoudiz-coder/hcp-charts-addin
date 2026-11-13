/**
 * indicators.js — Complete Indicator Registry (29 KPIs)
 * ======================================================
 * Each indicator maps to a specific CKAN dataset, resource,
 * and field name on data.gov.ma.
 *
 * IMPORTANT: The resourceId and resourceUrl values below are
 * PLACEHOLDERS. They must be populated by querying the actual
 * CKAN API (package_search → package_show) and inspecting
 * the real CSV/JSON files to determine exact field names.
 *
 * See docs/INDICATOR_MAP.md for step-by-step instructions.
 */

import INDICATOR_MAP from "./indicatorMap.json" with { type: "json" };
import SNAPSHOT_INDEX from "./snapshotIndex.json" with { type: "json" };


// ═══════════════════════════════════════════════════════
// INDICATOR CATEGORIES
// ═══════════════════════════════════════════════════════

export const CATEGORIES = [
  { id: "emploi",       label: "Emploi",       icon: "💼", color: "#1565C0" },
  { id: "demographie",  label: "Démographie",  icon: "👥", color: "#2E7D32" },
  { id: "economie",     label: "Économie",     icon: "📊", color: "#E65100" },
  { id: "prix",         label: "Prix",         icon: "🏷️", color: "#AD1457" },
  { id: "education",    label: "Éducation",    icon: "🎓", color: "#6A1B9A" },
  { id: "sante",        label: "Santé",        icon: "🏥", color: "#00838F" },
  { id: "agriculture",  label: "Agriculture",  icon: "🌾", color: "#33691E" },
  { id: "industrie",    label: "Industrie",    icon: "🏭", color: "#37474F" }
];

// ═══════════════════════════════════════════════════════
// ALL 29 INDICATORS
// ═══════════════════════════════════════════════════════

export const BASE_INDICATORS = [
  // ─── EMPLOI (6) ──────────────────────────────────────
  {
    id: "taux_chomage", label: "Taux de chômage", category: "emploi",
    unit: "%", description: "Pourcentage de la population active au chômage",
    datasetId: "taux-de-chomage", resourceId: "", resourceUrl: "",
    fieldName: "taux_chomage", yearField: "annee", regionField: "region",
    cityField: "ville", datastoreActive: false,
    availableYears: { min: 1999, max: 2024 }, availableRegions: "all"
  },
  {
    id: "taux_emploi", label: "Taux d\'emploi", category: "emploi",
    unit: "%", description: "Rapport entre la population employée et la population en âge de travailler",
    datasetId: "taux-demploi", resourceId: "", resourceUrl: "",
    fieldName: "taux_emploi", yearField: "annee", regionField: "region",
    cityField: "ville", datastoreActive: false,
    availableYears: { min: 1999, max: 2024 }, availableRegions: "all"
  },
  {
    id: "population_active", label: "Population active", category: "emploi",
    unit: "milliers", description: "Nombre total de personnes actives",
    datasetId: "population-active", resourceId: "", resourceUrl: "",
    fieldName: "population_active", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 1999, max: 2024 }, availableRegions: "all"
  },
  {
    id: "chomage_urbain", label: "Chômage urbain", category: "emploi",
    unit: "%", description: "Taux de chômage en milieu urbain",
    datasetId: "taux-de-chomage", resourceId: "", resourceUrl: "",
    fieldName: "chomage_urbain", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 1999, max: 2024 }, availableRegions: "all"
  },
  {
    id: "chomage_rural", label: "Chômage rural", category: "emploi",
    unit: "%", description: "Taux de chômage en milieu rural",
    datasetId: "taux-de-chomage", resourceId: "", resourceUrl: "",
    fieldName: "chomage_rural", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 1999, max: 2024 }, availableRegions: "all"
  },
  {
    id: "chomage_jeunes", label: "Chômage des jeunes 15-24", category: "emploi",
    unit: "%", description: "Taux de chômage des jeunes âgés de 15 à 24 ans",
    datasetId: "chomage-jeunes", resourceId: "", resourceUrl: "",
    fieldName: "chomage_jeunes_15_24", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 1999, max: 2024 }, availableRegions: "all"
  },

  // ─── DÉMOGRAPHIE (5) ─────────────────────────────────
  {
    id: "population_totale", label: "Population totale", category: "demographie",
    unit: "millions", description: "Population totale du Maroc",
    datasetId: "population-totale", resourceId: "", resourceUrl: "",
    fieldName: "population", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 1960, max: 2024 }, availableRegions: "all"
  },
  {
    id: "natalite", label: "Taux de natalité", category: "demographie",
    unit: "‰", description: "Nombre de naissances vivantes pour 1000 habitants",
    datasetId: "indicateurs-demographiques", resourceId: "", resourceUrl: "",
    fieldName: "taux_natalite", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 1960, max: 2024 }, availableRegions: "all"
  },
  {
    id: "mortalite", label: "Taux de mortalité", category: "demographie",
    unit: "‰", description: "Nombre de décès pour 1000 habitants",
    datasetId: "indicateurs-demographiques", resourceId: "", resourceUrl: "",
    fieldName: "taux_mortalite", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 1960, max: 2024 }, availableRegions: "all"
  },
  {
    id: "esperance_vie", label: "Espérance de vie", category: "demographie",
    unit: "ans", description: "Espérance de vie à la naissance",
    datasetId: "indicateurs-demographiques", resourceId: "", resourceUrl: "",
    fieldName: "esperance_vie", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 1960, max: 2024 }, availableRegions: "all"
  },
  {
    id: "urbanisation", label: "Taux d\'urbanisation", category: "demographie",
    unit: "%", description: "Pourcentage de la population vivant en milieu urbain",
    datasetId: "indicateurs-demographiques", resourceId: "", resourceUrl: "",
    fieldName: "taux_urbanisation", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 1960, max: 2024 }, availableRegions: "all"
  },

  // ─── ÉCONOMIE (4) ────────────────────────────────────
  {
    id: "pib", label: "PIB (Mrd MAD)", category: "economie",
    unit: "Mrd MAD", description: "Produit Intérieur Brut en milliards de dirhams",
    datasetId: "produit-interieur-brut", resourceId: "", resourceUrl: "",
    fieldName: "pib", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 1980, max: 2024 }, availableRegions: "national"
  },
  {
    id: "croissance_pib", label: "Croissance PIB", category: "economie",
    unit: "%", description: "Taux de croissance annuel du PIB réel",
    datasetId: "produit-interieur-brut", resourceId: "", resourceUrl: "",
    fieldName: "croissance_pib", yearField: "annee", regionField: null,
    cityField: null, datastoreActive: false,
    availableYears: { min: 1980, max: 2024 }, availableRegions: "national"
  },
  {
    id: "pib_habitant", label: "PIB par habitant", category: "economie",
    unit: "MAD", description: "PIB divisé par la population totale",
    datasetId: "produit-interieur-brut", resourceId: "", resourceUrl: "",
    fieldName: "pib_par_habitant", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 1980, max: 2024 }, availableRegions: "national"
  },
  {
    id: "investissement_pib", label: "Investissement / PIB", category: "economie",
    unit: "%", description: "Ratio de l\'investissement brut par rapport au PIB",
    datasetId: "investissement", resourceId: "", resourceUrl: "",
    fieldName: "investissement_pib", yearField: "annee", regionField: null,
    cityField: null, datastoreActive: false,
    availableYears: { min: 1998, max: 2024 }, availableRegions: "national"
  },

  // ─── PRIX (3) ────────────────────────────────────────
  {
    id: "ipc", label: "IPC (base 100)", category: "prix",
    unit: "indice", description: "Indice des Prix à la Consommation (base 100 = 2017)",
    datasetId: "indice-prix-consommation", resourceId: "", resourceUrl: "",
    fieldName: "ipc", yearField: "annee", regionField: "region",
    cityField: "ville", datastoreActive: false,
    availableYears: { min: 2000, max: 2024 }, availableRegions: "all"
  },
  {
    id: "inflation", label: "Taux d\'inflation", category: "prix",
    unit: "%", description: "Variation annuelle de l\'IPC",
    datasetId: "indice-prix-consommation", resourceId: "", resourceUrl: "",
    fieldName: "inflation", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 2000, max: 2024 }, availableRegions: "all"
  },
  {
    id: "inflation_alimentaire", label: "Inflation alimentaire", category: "prix",
    unit: "%", description: "Variation annuelle des prix des produits alimentaires",
    datasetId: "indice-prix-consommation", resourceId: "", resourceUrl: "",
    fieldName: "inflation_alimentaire", yearField: "annee", regionField: null,
    cityField: null, datastoreActive: false,
    availableYears: { min: 2000, max: 2024 }, availableRegions: "national"
  },

  // ─── ÉDUCATION (2) ───────────────────────────────────
  {
    id: "scolarisation_primaire", label: "Scolarisation primaire", category: "education",
    unit: "%", description: "Taux net de scolarisation au primaire",
    datasetId: "scolarisation", resourceId: "", resourceUrl: "",
    fieldName: "taux_scolarisation_primaire", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 2000, max: 2024 }, availableRegions: "all"
  },
  {
    id: "abandon_scolaire", label: "Abandon scolaire", category: "education",
    unit: "%", description: "Taux d\'abandon scolaire au cycle primaire",
    datasetId: "scolarisation", resourceId: "", resourceUrl: "",
    fieldName: "taux_abandon", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 2000, max: 2024 }, availableRegions: "all"
  },

  // ─── SANTÉ (3) ───────────────────────────────────────
  {
    id: "medecins", label: "Médecins / 10 000 hab.", category: "sante",
    unit: "pour 10 000", description: "Nombre de médecins pour 10 000 habitants",
    datasetId: "indicateurs-sante", resourceId: "", resourceUrl: "",
    fieldName: "medecins_10k", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 2000, max: 2024 }, availableRegions: "all"
  },
  {
    id: "couverture_medicale", label: "Couverture maladie des salariés", category: "sante",
    unit: "%", description: "Pourcentage de la population bénéficiant d\'une couverture médicale",
    datasetId: "indicateurs-sante", resourceId: "", resourceUrl: "",
    fieldName: "couverture_medicale", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 2005, max: 2024 }, availableRegions: "all"
  },
  {
    id: "mortalite_infantile", label: "Mortalité infantile", category: "sante",
    unit: "‰", description: "Décès d\'enfants de moins d\'un an pour 1000 naissances",
    datasetId: "indicateurs-sante", resourceId: "", resourceUrl: "",
    fieldName: "mortalite_infantile", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 1980, max: 2024 }, availableRegions: "all"
  },

  // ─── AGRICULTURE (2) ─────────────────────────────────
  {
    id: "production_cerealiere", label: "Production céréalière", category: "agriculture",
    unit: "millions quintaux", description: "Production annuelle de céréales",
    datasetId: "production-cerealiere", resourceId: "", resourceUrl: "",
    fieldName: "production_cereales", yearField: "annee", regionField: "region",
    cityField: null, datastoreActive: false,
    availableYears: { min: 1980, max: 2024 }, availableRegions: "all"
  },
  {
    id: "exportations_agricoles", label: "Exportations agricoles", category: "agriculture",
    unit: "Mrd MAD", description: "Valeur des exportations de produits agricoles",
    datasetId: "commerce-exterieur-agricole", resourceId: "", resourceUrl: "",
    fieldName: "exportations_agricoles", yearField: "annee", regionField: null,
    cityField: null, datastoreActive: false,
    availableYears: { min: 2000, max: 2024 }, availableRegions: "national"
  },

  // ─── INDUSTRIE (4) ───────────────────────────────────
  {
    id: "indice_production_industrielle", label: "Indice production industrielle", category: "industrie",
    unit: "indice", description: "Indice de la production industrielle (base 100)",
    datasetId: "production-industrielle", resourceId: "", resourceUrl: "",
    fieldName: "indice_production", yearField: "annee", regionField: null,
    cityField: null, datastoreActive: false,
    availableYears: { min: 2000, max: 2024 }, availableRegions: "national"
  },
  {
    id: "exportations", label: "Exportations totales", category: "industrie",
    unit: "Mrd MAD", description: "Valeur totale des exportations de biens",
    datasetId: "commerce-exterieur", resourceId: "", resourceUrl: "",
    fieldName: "exportations", yearField: "annee", regionField: null,
    cityField: null, datastoreActive: false,
    availableYears: { min: 1998, max: 2024 }, availableRegions: "national"
  },
  {
    id: "importations", label: "Importations totales", category: "industrie",
    unit: "Mrd MAD", description: "Valeur totale des importations de biens",
    datasetId: "commerce-exterieur", resourceId: "", resourceUrl: "",
    fieldName: "importations", yearField: "annee", regionField: null,
    cityField: null, datastoreActive: false,
    availableYears: { min: 1998, max: 2024 }, availableRegions: "national"
  },
  {
    id: "ide", label: "IDE reçus", category: "industrie",
    unit: "Mrd MAD", description: "Investissements Directs Étrangers reçus par le Maroc",
    datasetId: "investissements-directs-etrangers", resourceId: "", resourceUrl: "",
    fieldName: "ide_recus", yearField: "annee", regionField: null,
    cityField: null, datastoreActive: false,
    availableYears: { min: 2000, max: 2024 }, availableRegions: "national"
  }
];

// ═══════════════════════════════════════════════════════
// v1.2 — MERGE WITH REAL data.gov.ma MAPPING
// indicatorMap.json is written by `npm run map-indicators` (and can be
// edited by hand; set "locked": true to protect an entry).
// ═══════════════════════════════════════════════════════

// import.meta.env exists under Vite/Vitest only; Node scripts see undefined.
const STATIC_MODE = (import.meta.env?.VITE_DATA_SOURCE || "proxy") === "static";

const MAP_FIELDS = ["datasetId", "datasetTitle", "resourceId", "resourceUrl", "format", "datastoreActive",
  "layout", "yearField", "regionField", "cityField", "valueField", "rowLabelField", "rowMatch",
  "filters", "sheet", "headerRow", "scale", "transform", "confidence", "lastModified"];

export const INDICATORS = BASE_INDICATORS.map((base) => {
  const m = (INDICATOR_MAP.indicators || {})[base.id];
  const merged = { ...base, resourceId: "", resourceUrl: "", datastoreActive: false, mapped: false,
                   layout: "long", valueField: null, regionField: null, cityField: null };
  if (m) {
    for (const k of MAP_FIELDS) if (m[k] !== undefined) merged[k] = m[k];
    merged.fieldName = m.valueField || base.fieldName;
    merged.mapped = !!m.mapped && !!(m.resourceUrl || (m.datastoreActive && m.resourceId));
    if (!merged.regionField) merged.availableRegions = "national";
  }
  // GitHub Pages build: data comes from nightly snapshots (public/data/<id>.json)
  if (STATIC_MODE) {
    const snap = (SNAPSHOT_INDEX.indicators || {})[base.id];
    merged.mapped = merged.mapped && !!snap?.ok;
    merged.snapshotDate = snap?.fetchedAt || null;
  }
  return merged;
});

/**
 * Enable/disable indicators from the live public/data/status.json (static mode).
 * Lets an already-built add-in pick up indicators mapped after it was built.
 * @returns {number} number of available indicators
 */
export function applySnapshotStatus(status) {
  if (!status || !Array.isArray(status.indicators)) return INDICATORS.filter(i => i.mapped).length;
  const byId = Object.fromEntries(status.indicators.map(s => [s.id, s]));
  for (const ind of INDICATORS) {
    const s = byId[ind.id];
    ind.mapped = !!s?.ok;
    ind.snapshotDate = s?.ok ? status.generatedAt : null;
    if (s?.national === true) ind.availableRegions = "national";
  }
  return INDICATORS.filter(i => i.mapped).length;
}

export const MAPPING_META = {
  generatedAt: INDICATOR_MAP.generatedAt || null,
  ckanBase: INDICATOR_MAP.ckanBase || null,
  snapshotsAt: SNAPSHOT_INDEX.generatedAt || null,
  dataSource: STATIC_MODE ? "static" : "proxy"
};

// ═══════════════════════════════════════════════════════
// DERIVED LOOKUPS
// ═══════════════════════════════════════════════════════

export const INDICATORS_BY_ID = Object.fromEntries(
  INDICATORS.map(ind => [ind.id, ind])
);

export function getIndicatorsByCategory() {
  return CATEGORIES.map(cat => ({
    category: cat,
    indicators: INDICATORS.filter(ind => ind.category === cat.id)
  }));
}

export function searchIndicators(query) {
  if (!query || query.trim() === "") return INDICATORS;
  const lower = query.toLowerCase();
  return INDICATORS.filter(ind =>
    ind.label.toLowerCase().includes(lower) ||
    ind.description.toLowerCase().includes(lower) ||
    ind.category.toLowerCase().includes(lower)
  );
}

export function getRegionalIndicators() {
  return INDICATORS.filter(ind => ind.availableRegions === "all");
}

export function getNationalIndicators() {
  return INDICATORS.filter(ind => ind.availableRegions === "national");
}

export const INDICATOR_STATS = {
  total: INDICATORS.length,
  categories: CATEGORIES.length,
  regional: INDICATORS.filter(i => i.availableRegions === "all").length,
  national: INDICATORS.filter(i => i.availableRegions === "national").length,
  mapped: INDICATORS.filter(i => i.mapped).length
};

export default {
  CATEGORIES, BASE_INDICATORS, INDICATORS, INDICATORS_BY_ID, MAPPING_META,
  getIndicatorsByCategory, searchIndicators,
  getRegionalIndicators, getNationalIndicators, INDICATOR_STATS
};
