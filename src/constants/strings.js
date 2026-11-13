/**
 * strings.js — All UI Strings (French)
 * Every user-visible string in a single file for easy localization.
 */

const STRINGS = {
  app: {
    title: "HCP Charts",
    subtitle: "Statistiques du Maroc",
    version: "v1.2.0",
    poweredBy: "Données: data.gov.ma — HCP"
  },
  filters: {
    title: "Filtres",
    region: {
      label: "Région",
      placeholder: "Toutes les régions",
      national: "Niveau National"
    },
    city: {
      label: "Province / Ville",
      placeholder: "Toutes les provinces",
      disabled: "Sélectionnez d\'abord une région"
    },
    indicators: {
      label: "Indicateurs (KPI)",
      placeholder: "Rechercher un indicateur...",
      selectAll: "Tout sélectionner",
      deselectAll: "Tout désélectionner",
      selected: "sélectionné(s)",
      noResults: "Aucun indicateur trouvé pour",
      maxWarning: "Sélectionner plus de 8 indicateurs peut produire un graphique illisible."
    },
    year: {
      label: "Période",
      startYear: "Année de début",
      endYear: "Année de fin",
      invalidRange: "L\'année de début doit être inférieure ou égale à l\'année de fin."
    },
    chartType: {
      label: "Type de graphique",
      auto: "Automatique (recommandé)",
      native: "Graphiques natifs PowerPoint",
      advanced: "Graphiques avancés",
      recommended: "Recommandé"
    }
  },
  actions: {
    insertChart: "Insérer le graphique",
    insertMultiple: "Insérer le graphique",
    reset: "Réinitialiser",
    refreshData: "Actualiser les données",
    close: "Fermer"
  },
  loading: {
    initializing: "Initialisation...",
    fetchingCatalog: "Chargement du catalogue HCP...",
    fetchingData: "Récupération des données...",
    buildingChart: "Construction du graphique...",
    insertingSlide: "Insertion dans la diapositive...",
    complete: "Terminé !",
    steps: {
      step1: "Connexion à data.gov.ma",
      step2: "Récupération des données",
      step3: "Normalisation",
      step4: "Construction du graphique",
      step5: "Insertion dans PowerPoint"
    }
  },
  errors: {
    networkError: "Impossible de se connecter à data.gov.ma. Vérifiez votre connexion internet.",
    noData: "Aucune donnée disponible pour cette combinaison de filtres.",
    noDataRegion: "Aucune donnée disponible pour {indicator} dans {region}.",
    noDataYear: "Aucune donnée disponible pour la période {startYear}–{endYear}.",
    insertionFailed: "Impossible d\'insérer le graphique dans la diapositive.",
    parseError: "Erreur lors de l\'analyse des données.",
    proxyError: "Erreur du serveur proxy. Veuillez réessayer.",
    officeVersion: "Votre version de PowerPoint ne supporte pas cette fonctionnalité.",
    generic: "Une erreur inattendue s\'est produite. Veuillez réessayer.",
    retry: "Réessayer",
    details: "Détails techniques"
  },
  empty: {
    welcome: {
      title: "Bienvenue dans HCP Charts",
      description: "Sélectionnez un ou plusieurs indicateurs pour commencer.",
      hint: "💡 Commencez par choisir un indicateur dans la liste ci-dessus."
    },
    noIndicators: {
      title: "Aucun indicateur sélectionné",
      description: "Sélectionnez au moins un indicateur pour générer un graphique."
    }
  },
  chart: {
    source: "Source : HCP — data.gov.ma",
    national: "Niveau National",
    regionPrefix: "Région :",
    yearRange: "{start}–{end}",
    unitPrefix: "Unité :",
    axisYear: "Année",
    noTitle: "Graphique HCP"
  },
  tooltips: {
    region: "Filtrer par région administrative du Maroc",
    city: "Filtrer par province ou préfecture",
    indicators: "Sélectionnez les indicateurs à visualiser.",
    yearStart: "Première année de la période",
    yearEnd: "Dernière année de la période",
    chartType: "Choisissez le type de graphique ou laissez en automatique",
    insertChart: "Générer et insérer le graphique dans la diapositive active",
    reset: "Effacer tous les filtres",
    refresh: "Vider le cache et recharger les données"
  },
  a11y: {
    filterPanel: "Panneau de filtres HCP Charts",
    regionSelect: "Sélecteur de région",
    citySelect: "Sélecteur de province",
    indicatorList: "Liste des indicateurs",
    yearStartInput: "Année de début",
    yearEndInput: "Année de fin",
    chartTypeGrid: "Grille de sélection du type de graphique",
    insertButton: "Bouton d\'insertion du graphique",
    loadingIndicator: "Chargement en cours",
    errorAlert: "Message d\'erreur"
  }
};

/**
 * Template string replacement
 * @param {string} template - String with {placeholders}
 * @param {object} values - Key-value replacements
 * @returns {string}
 */
export function t(template, values = {}) {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return result;
}

/**
 * Get a nested string by dot path
 * @param {string} path - e.g., "filters.region.label"
 * @returns {string}
 */
export function getString(path) {
  return path.split(".").reduce((obj, key) => obj?.[key], STRINGS) || path;
}

export default STRINGS;
