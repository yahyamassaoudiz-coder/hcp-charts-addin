/**
 * geography.js — Complete Administrative Geography of Morocco
 * =============================================================
 * 12 Regions with all constituent provinces and prefectures.
 *
 * Used by:
 *   - Task pane UI (Region and City dropdowns)
 *   - DataNormalizer (region name fuzzy matching)
 *   - LabelBuilder (geographic label generation)
 */

export const REGIONS = [
  {
    id: "casablanca-settat",
    name: "Casablanca-Settat",
    provinces: [
      "Casablanca", "Mohammedia", "El Jadida", "Settat",
      "Berrechid", "Benslimane", "Médiouna", "Nouaceur", "Sidi Bennour"
    ]
  },
  {
    id: "rabat-sale-kenitra",
    name: "Rabat-Salé-Kénitra",
    provinces: [
      "Rabat", "Salé", "Kénitra", "Témara",
      "Skhirate", "Khémisset", "Sidi Kacem", "Sidi Slimane"
    ]
  },
  {
    id: "tanger-tetouan-al-hoceima",
    name: "Tanger-Tétouan-Al Hoceïma",
    provinces: [
      "Tanger-Assilah", "Tétouan", "Al Hoceïma", "Larache",
      "Chefchaouen", "Ouezzane", "Fahs-Anjra", "M\'diq-Fnideq"
    ]
  },
  {
    id: "fes-meknes",
    name: "Fès-Meknès",
    provinces: [
      "Fès", "Meknès", "Taza", "Ifrane", "Séfrou",
      "Boulemane", "El Hajeb", "Moulay Yacoub", "Taounate"
    ]
  },
  {
    id: "marrakech-safi",
    name: "Marrakech-Safi",
    provinces: [
      "Marrakech", "Safi", "Essaouira", "El Kelâa des Sraghna",
      "Chichaoua", "Al Haouz", "Rehamna", "Youssoufia"
    ]
  },
  {
    id: "souss-massa",
    name: "Souss-Massa",
    provinces: [
      "Agadir Ida-Ou-Tanane", "Inezgane-Aït Melloul",
      "Tiznit", "Taroudant", "Chtouka-Aït Baha", "Tata"
    ]
  },
  {
    id: "oriental",
    name: "Oriental",
    provinces: [
      "Oujda-Angad", "Nador", "Berkane", "Taourirt",
      "Jerada", "Driouch", "Figuig", "Guercif"
    ]
  },
  {
    id: "draa-tafilalet",
    name: "Drâa-Tafilalet",
    provinces: [
      "Errachidia", "Ouarzazate", "Tinghir", "Zagora", "Midelt"
    ]
  },
  {
    id: "beni-mellal-khenifra",
    name: "Béni Mellal-Khénifra",
    provinces: [
      "Béni Mellal", "Khénifra", "Khouribga", "Fquih Ben Salah", "Azilal"
    ]
  },
  {
    id: "laayoune-sakia-el-hamra",
    name: "Laâyoune-Sakia El Hamra",
    provinces: [
      "Laâyoune", "Boujdour", "Tarfaya", "Es-Semara"
    ]
  },
  {
    id: "guelmim-oued-noun",
    name: "Guelmim-Oued Noun",
    provinces: [
      "Guelmim", "Tan-Tan", "Sidi Ifni", "Assa-Zag"
    ]
  },
  {
    id: "dakhla-oued-ed-dahab",
    name: "Dakhla-Oued Ed-Dahab",
    provinces: [
      "Oued Ed-Dahab", "Aousserd"
    ]
  }
];

// ═══════════════════════════════════════════════════════
// DERIVED LOOKUPS
// ═══════════════════════════════════════════════════════

export const REGIONS_FLAT = REGIONS.map(r => r.name);

export const REGIONS_BY_ID = Object.fromEntries(
  REGIONS.map(r => [r.id, r])
);

export const REGIONS_BY_NAME = Object.fromEntries(
  REGIONS.map(r => [r.name, r])
);

export function getProvinces(regionId) {
  const region = REGIONS_BY_ID[regionId] || REGIONS_BY_NAME[regionId];
  return region ? region.provinces : [];
}

export function findRegionByProvince(provinceName) {
  const lower = provinceName.toLowerCase();
  return REGIONS.find(r =>
    r.provinces.some(p => p.toLowerCase().includes(lower))
  ) || null;
}

export function getAllProvinces() {
  return REGIONS.flatMap(r => r.provinces).sort();
}

export const GEO_STATS = {
  regions: REGIONS.length,
  provinces: REGIONS.reduce((sum, r) => sum + r.provinces.length, 0)
};

export default {
  REGIONS, REGIONS_FLAT, REGIONS_BY_ID, REGIONS_BY_NAME,
  getProvinces, findRegionByProvince, getAllProvinces, GEO_STATS
};
