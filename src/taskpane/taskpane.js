/**
 * taskpane.js — Task Pane Controller (FIXED)
 * ============================================
 * Main entry point for the HCP Charts add-in UI.
 *
 * FIXES APPLIED:
 *   - Single complete write (no truncation/overwrite)
 *   - state.autoChart → state.autoChartType (was undefined)
 *
 * Orchestrates:
 *   - Office.js initialization
 *   - Filter UI population and interaction
 *   - Data fetching via DataService
 *   - Chart building via ChartEngine
 *   - Chart insertion via OfficeService
 *   - Loading, error, and success states
 */

import OfficeService from "../services/OfficeService.js";
import DataService from "../services/DataService.js";
import DataNormalizer from "../services/DataNormalizer.js";
import ChartEngine from "../services/ChartEngine.js";
import LabelBuilder from "../services/LabelBuilder.js";
import CacheService from "../services/CacheService.js";

import { REGIONS, getProvinces } from "../constants/geography.js";
import {
  INDICATORS,
  CATEGORIES,
  INDICATORS_BY_ID,
  getIndicatorsByCategory,
  searchIndicators
} from "../constants/indicators.js";
import {
  ALL_CHARTS,
  CHART_GROUPS,
  CHARTS_BY_ID,
  suggestChartType,
  checkCompatibility
} from "../constants/chartTypes.js";
import { INDICATOR_STATS } from "../constants/indicators.js";
import STRINGS from "../constants/strings.js";
import { escapeHtml, validateYearRange } from "../utils/sanitize.js";

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════

const state = {
  selectedRegion: null,
  selectedRegionId: null,
  selectedCity: null,
  selectedIndicators: new Set(),
  startYear: 2015,
  endYear: 2024,
  selectedChartType: null,
  autoChartType: true,    // FIX: was "autoChart" (undefined)
  isLoading: false,
  capabilities: null,
  lastError: null,
  lastAction: null
};

// ═══════════════════════════════════════════════════════
// DOM REFERENCES
// ═══════════════════════════════════════════════════════

const DOM = {};

function cacheDOMRefs() {
  DOM.welcomeScreen = document.getElementById("welcome-screen");
  DOM.filtersPanel = document.getElementById("filters-panel");
  DOM.selectRegion = document.getElementById("select-region");
  DOM.selectCity = document.getElementById("select-city");
  DOM.inputSearch = document.getElementById("input-indicator-search");
  DOM.btnClearSearch = document.getElementById("btn-clear-search");
  DOM.btnSelectAll = document.getElementById("btn-select-all");
  DOM.btnDeselectAll = document.getElementById("btn-deselect-all");
  DOM.selectedTags = document.getElementById("selected-tags");
  DOM.indicatorList = document.getElementById("indicator-list");
  DOM.indicatorCount = document.getElementById("indicator-count");
  DOM.maxWarning = document.getElementById("max-warning");
  DOM.inputStartYear = document.getElementById("input-start-year");
  DOM.inputEndYear = document.getElementById("input-end-year");
  DOM.yearError = document.getElementById("year-error");
  DOM.toggleAutoChart = document.getElementById("toggle-auto-chart");
  DOM.suggestedChart = document.getElementById("suggested-chart");
  DOM.suggestedChartName = document.getElementById("suggested-chart-name");
  DOM.chartTypeGrid = document.getElementById("chart-type-grid");
  DOM.btnInsert = document.getElementById("btn-insert");
  DOM.btnReset = document.getElementById("btn-reset");
  DOM.btnRefresh = document.getElementById("btn-refresh");
  DOM.loadingOverlay = document.getElementById("loading-overlay");
  DOM.errorBanner = document.getElementById("error-banner");
  DOM.errorMessage = document.getElementById("error-message");
  DOM.btnRetry = document.getElementById("btn-retry");
  DOM.btnDismissError = document.getElementById("btn-dismiss-error");
  DOM.successToast = document.getElementById("success-toast");
}

// ═══════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════

async function init() {
  console.log("[HCP Charts] Initializing...");
  cacheDOMRefs();

  try {
    state.capabilities = await OfficeService.initialize();
    console.log("[HCP Charts] Office capabilities:", state.capabilities);
  } catch (e) {
    console.warn("[HCP Charts] Office.js init warning:", e.message);
  }

  populateRegions();
  populateIndicators();
  populateChartTypes();
  if (INDICATOR_STATS.mapped === 0) {
    showNotes(["Aucun indicateur n'est encore relié à data.gov.ma. Lancez « npm run map-indicators » puis rechargez."]);
  }
  bindEvents();
  updateInsertButton();
  updateChartSuggestion();
  updateWelcomeScreen();

  console.log("[HCP Charts] Ready.");
}

// ═══════════════════════════════════════════════════════
// REGION & CITY POPULATION
// ═══════════════════════════════════════════════════════

function populateRegions() {
  DOM.selectRegion.innerHTML = '<option value="">' +
    escapeHtml(STRINGS.filters.region.placeholder) + '</option>';
  for (const region of REGIONS) {
    const opt = document.createElement("option");
    opt.value = region.id;
    opt.textContent = region.name;
    DOM.selectRegion.appendChild(opt);
  }
}

function populateCities(regionId) {
  DOM.selectCity.innerHTML = '';
  if (!regionId) {
    DOM.selectCity.innerHTML = '<option value="">' +
      escapeHtml(STRINGS.filters.city.disabled) + '</option>';
    DOM.selectCity.disabled = true;
    state.selectedCity = null;
    return;
  }
  const provinces = getProvinces(regionId);
  DOM.selectCity.disabled = false;
  DOM.selectCity.innerHTML = '<option value="">' +
    escapeHtml(STRINGS.filters.city.placeholder) + '</option>';
  for (const province of provinces) {
    const opt = document.createElement("option");
    opt.value = province;
    opt.textContent = province;
    DOM.selectCity.appendChild(opt);
  }
}

// ═══════════════════════════════════════════════════════
// INDICATOR LIST POPULATION
// ═══════════════════════════════════════════════════════

function populateIndicators() {
  DOM.indicatorList.innerHTML = "";
  const grouped = getIndicatorsByCategory();

  const noResults = document.createElement("div");
  noResults.className = "indicator-no-results";
  noResults.id = "indicator-no-results";
  noResults.textContent = STRINGS.filters.indicators.noResults;
  DOM.indicatorList.appendChild(noResults);

  for (const group of grouped) {
    const header = document.createElement("div");
    header.className = "indicator-category";
    header.dataset.category = group.category.id;
    header.innerHTML =
      '<span class="indicator-category__icon">' + escapeHtml(group.category.icon) + '</span> ' +
      escapeHtml(group.category.label) +
      '<span style="margin-left:auto;font-size:10px;opacity:0.6">' + group.indicators.length + '</span>';
    DOM.indicatorList.appendChild(header);

    for (const ind of group.indicators) {
      const item = document.createElement("div");
      item.className = "indicator-item";
      item.dataset.indicatorId = ind.id;
      item.dataset.category = ind.category;
      if (!ind.mapped) {
        item.classList.add("indicator-item--unmapped");
        item.setAttribute("aria-disabled", "true");
        item.title = "Pas encore relié à une ressource data.gov.ma (npm run map-indicators)";
      }
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", "false");
      item.innerHTML =
        '<input type="checkbox" class="indicator-item__checkbox" ' + (ind.mapped ? '' : 'disabled ') +
        'id="chk-' + escapeHtml(ind.id) + '" ' +
        'value="' + escapeHtml(ind.id) + '" ' +
        'aria-label="' + escapeHtml(ind.label) + '"/>' +
        '<label class="indicator-item__label" for="chk-' + escapeHtml(ind.id) + '">' +
        escapeHtml(ind.label) + '</label>' +
        '<span class="indicator-item__unit">' + escapeHtml(ind.unit) + '</span>' +
        (ind.mapped ? '' : '<span class="indicator-item__badge">non relié</span>');
      DOM.indicatorList.appendChild(item);
    }
  }
}

// ═══════════════════════════════════════════════════════
// CHART TYPE GRID
// ═══════════════════════════════════════════════════════

function populateChartTypes() {
  DOM.chartTypeGrid.innerHTML = "";
  for (const group of CHART_GROUPS) {
    const groupLabel = document.createElement("div");
    groupLabel.className = "chart-type-group-label";
    groupLabel.textContent = group.label;
    DOM.chartTypeGrid.appendChild(groupLabel);

    const chartsInGroup = ALL_CHARTS.filter(c => c.group === group.id);
    for (const chart of chartsInGroup) {
      const btn = document.createElement("button");
      btn.className = "chart-type-btn";
      btn.dataset.chartId = chart.id;
      btn.type = "button";
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", "false");
      btn.setAttribute("aria-label", chart.label);
      btn.title = chart.description;
      btn.innerHTML =
        '<span class="chart-type-btn__icon">' + escapeHtml(chart.icon) + '</span>' +
        '<span class="chart-type-btn__label">' + escapeHtml(chart.label) + '</span>';
      DOM.chartTypeGrid.appendChild(btn);
    }
  }
}

// ═══════════════════════════════════════════════════════
// EVENT BINDING
// ═══════════════════════════════════════════════════════

function bindEvents() {
  // Region change
  DOM.selectRegion.addEventListener("change", (e) => {
    const regionId = e.target.value;
    const regionObj = REGIONS.find(r => r.id === regionId);
    state.selectedRegion = regionObj ? regionObj.name : null;
    state.selectedRegionId = regionId || null;
    populateCities(regionId);
    updateInsertButton();
  });

  // City change
  DOM.selectCity.addEventListener("change", (e) => {
    state.selectedCity = e.target.value || null;
    updateInsertButton();
  });

  // Indicator search
  DOM.inputSearch.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    filterIndicatorList(query);
    DOM.btnClearSearch.classList.toggle("visible", query.length > 0);
  });

  DOM.btnClearSearch.addEventListener("click", () => {
    DOM.inputSearch.value = "";
    filterIndicatorList("");
    DOM.btnClearSearch.classList.remove("visible");
    DOM.inputSearch.focus();
  });

  // Select All / Deselect All
  DOM.btnSelectAll.addEventListener("click", () => {
    const visibleItems = DOM.indicatorList.querySelectorAll(
      ".indicator-item:not(.indicator-item--hidden):not(.indicator-item--unmapped)"
    );
    visibleItems.forEach(item => {
      const id = item.dataset.indicatorId;
      state.selectedIndicators.add(id);
      const chk = item.querySelector("input[type=checkbox]");
      if (chk) chk.checked = true;
      item.classList.add("selected");
      item.setAttribute("aria-selected", "true");
    });
    onIndicatorSelectionChanged();
  });

  DOM.btnDeselectAll.addEventListener("click", () => {
    state.selectedIndicators.clear();
    DOM.indicatorList.querySelectorAll(".indicator-item").forEach(item => {
      const chk = item.querySelector("input[type=checkbox]");
      if (chk) chk.checked = false;
      item.classList.remove("selected");
      item.setAttribute("aria-selected", "false");
    });
    onIndicatorSelectionChanged();
  });

  // Indicator clicks
  DOM.indicatorList.addEventListener("click", (e) => {
    const item = e.target.closest(".indicator-item");
    if (!item) return;
    if (item.classList.contains("indicator-item--unmapped")) return;
    const id = item.dataset.indicatorId;
    const chk = item.querySelector("input[type=checkbox]");
    // A <label for=…> click also fires a synthetic click on the checkbox,
    // which toggled it twice (never selected). Handle the row ourselves.
    if (e.target.closest("label")) e.preventDefault();
    if (e.target !== chk) { chk.checked = !chk.checked; }
    if (chk.checked) {
      state.selectedIndicators.add(id);
      item.classList.add("selected");
      item.setAttribute("aria-selected", "true");
    } else {
      state.selectedIndicators.delete(id);
      item.classList.remove("selected");
      item.setAttribute("aria-selected", "false");
    }
    onIndicatorSelectionChanged();
  });

  // Year inputs
  DOM.inputStartYear.addEventListener("change", (e) => {
    state.startYear = parseInt(e.target.value, 10) || 2015;
    validateYears();
    updateChartSuggestion();
  });

  DOM.inputEndYear.addEventListener("change", (e) => {
    state.endYear = parseInt(e.target.value, 10) || 2024;
    validateYears();
    updateChartSuggestion();
  });

  // Chart type toggle
  // FIX: state.autoChartType (was state.autoChart — undefined)
  DOM.toggleAutoChart.addEventListener("change", (e) => {
    state.autoChartType = e.target.checked;
    if (state.autoChartType) {
      DOM.chartTypeGrid.style.display = "none";
      DOM.suggestedChart.style.display = "flex";
      state.selectedChartType = null;
      deselectAllChartTypes();
    } else {
      DOM.chartTypeGrid.style.display = "grid";
      DOM.suggestedChart.style.display = "none";
    }
    updateChartSuggestion();
  });

  // Chart type grid clicks
  DOM.chartTypeGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".chart-type-btn");
    if (!btn) return;
    deselectAllChartTypes();
    btn.classList.add("selected");
    btn.setAttribute("aria-checked", "true");
    state.selectedChartType = btn.dataset.chartId;
  });

  // Insert button
  DOM.btnInsert.addEventListener("click", () => { handleInsertChart(); });

  // Reset button
  DOM.btnReset.addEventListener("click", () => { resetAllFilters(); });

  // Refresh button
  DOM.btnRefresh.addEventListener("click", () => {
    CacheService.clearAll();
    showSuccessToast("Cache vidé. Les données seront rechargées.");
  });

  // Error banner
  DOM.btnRetry.addEventListener("click", () => {
    hideError();
    if (state.lastAction) { state.lastAction(); }
  });
  DOM.btnDismissError.addEventListener("click", () => { hideError(); });
}

// ═══════════════════════════════════════════════════════
// INDICATOR SEARCH / FILTER
// ═══════════════════════════════════════════════════════

function filterIndicatorList(query) {
  const items = DOM.indicatorList.querySelectorAll(".indicator-item");
  const categories = DOM.indicatorList.querySelectorAll(".indicator-category");
  const noResults = document.getElementById("indicator-no-results");
  let visibleCount = 0;
  const visibleCategories = new Set();

  items.forEach(item => {
    if (!query) {
      item.classList.remove("indicator-item--hidden");
      visibleCount++;
      visibleCategories.add(item.dataset.category);
      return;
    }
    const id = item.dataset.indicatorId;
    const ind = INDICATORS_BY_ID[id];
    if (!ind) return;
    const searchText = (ind.label + " " + ind.description + " " + ind.category).toLowerCase();
    const matches = searchText.includes(query.toLowerCase());
    item.classList.toggle("indicator-item--hidden", !matches);
    if (matches) { visibleCount++; visibleCategories.add(item.dataset.category); }
  });

  categories.forEach(cat => {
    cat.style.display = visibleCategories.has(cat.dataset.category) ? "flex" : "none";
  });

  if (noResults) {
    noResults.classList.toggle("visible", visibleCount === 0 && query.length > 0);
    if (visibleCount === 0 && query) {
      noResults.textContent = STRINGS.filters.indicators.noResults + ' "' + escapeHtml(query) + '"';
    }
  }
}

// ═══════════════════════════════════════════════════════
// SELECTION HANDLERS
// ═══════════════════════════════════════════════════════

function onIndicatorSelectionChanged() {
  updateSelectedTags();
  updateInsertButton();
  updateChartSuggestion();
  updateWelcomeScreen();
  DOM.maxWarning.style.display = state.selectedIndicators.size > 8 ? "block" : "none";
}

function updateSelectedTags() {
  DOM.selectedTags.innerHTML = "";
  for (const id of state.selectedIndicators) {
    const ind = INDICATORS_BY_ID[id];
    if (!ind) continue;
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.innerHTML =
      '<span class="tag__label">' + escapeHtml(ind.label) + '</span>' +
      '<button class="tag__remove" data-id="' + escapeHtml(id) +
      '" title="Retirer" aria-label="Retirer ' + escapeHtml(ind.label) + '">✕</button>';
    DOM.selectedTags.appendChild(tag);
  }

  DOM.selectedTags.querySelectorAll(".tag__remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const removeId = e.currentTarget.dataset.id;
      state.selectedIndicators.delete(removeId);
      const item = DOM.indicatorList.querySelector('[data-indicator-id="' + removeId + '"]');
      if (item) {
        const chk = item.querySelector("input[type=checkbox]");
        if (chk) chk.checked = false;
        item.classList.remove("selected");
        item.setAttribute("aria-selected", "false");
      }
      onIndicatorSelectionChanged();
    });
  });

  const count = state.selectedIndicators.size;
  DOM.indicatorCount.textContent = count;
  DOM.indicatorCount.dataset.count = count;
}

// ═══════════════════════════════════════════════════════
// YEAR VALIDATION
// ═══════════════════════════════════════════════════════

function validateYears() {
  const rangeResult = validateYearRange(state.startYear, state.endYear);
  if (!rangeResult) {
    DOM.yearError.textContent = STRINGS.filters.year.invalidRange;
    DOM.yearError.style.display = "block";
    return false;
  }
  DOM.yearError.style.display = "none";
  return true;
}

// ═══════════════════════════════════════════════════════
// CHART SUGGESTION
// ═══════════════════════════════════════════════════════

function updateChartSuggestion() {
  if (!state.autoChartType) return;
  const context = {
    indicatorCount: state.selectedIndicators.size,
    units: [...state.selectedIndicators].map(id => INDICATORS_BY_ID[id]?.unit),
    isTimeSeries: state.startYear !== state.endYear,
    isSnapshot: state.startYear === state.endYear,
    hasRegionalData: !!state.selectedRegion
  };
  const suggestion = suggestChartType(context);
  if (suggestion && suggestion.primary) {
    DOM.suggestedChart.style.display = "flex";
    DOM.suggestedChartName.textContent =
      suggestion.primary.icon + " " + suggestion.primary.label;
  } else {
    DOM.suggestedChart.style.display = "none";
  }
}

function deselectAllChartTypes() {
  DOM.chartTypeGrid.querySelectorAll(".chart-type-btn").forEach(btn => {
    btn.classList.remove("selected");
    btn.setAttribute("aria-checked", "false");
  });
}

// ═══════════════════════════════════════════════════════
// UI STATE UPDATES
// ═══════════════════════════════════════════════════════

function updateInsertButton() {
  const hasIndicators = state.selectedIndicators.size > 0;
  const yearsValid = validateYears();
  DOM.btnInsert.disabled = !(hasIndicators && yearsValid);
  const textEl = DOM.btnInsert.querySelector(".btn-primary__text");
  if (textEl) {
    textEl.textContent = state.selectedIndicators.size > 1
      ? STRINGS.actions.insertMultiple
      : STRINGS.actions.insertChart;
  }
}

function updateWelcomeScreen() {
  DOM.welcomeScreen.style.display = state.selectedIndicators.size > 0 ? "none" : "block";
}

function resetAllFilters() {
  state.selectedRegion = null;
  state.selectedRegionId = null;
  state.selectedCity = null;
  state.selectedIndicators.clear();
  state.startYear = 2015;
  state.endYear = 2024;
  state.selectedChartType = null;
  state.autoChartType = true;

  DOM.selectRegion.value = "";
  populateCities(null);
  DOM.inputSearch.value = "";
  filterIndicatorList("");
  DOM.btnClearSearch.classList.remove("visible");

  DOM.indicatorList.querySelectorAll(".indicator-item").forEach(item => {
    const chk = item.querySelector("input[type=checkbox]");
    if (chk) chk.checked = false;
    item.classList.remove("selected");
    item.setAttribute("aria-selected", "false");
  });

  DOM.inputStartYear.value = "2015";
  DOM.inputEndYear.value = "2024";
  DOM.yearError.style.display = "none";
  DOM.toggleAutoChart.checked = true;
  DOM.chartTypeGrid.style.display = "none";
  DOM.suggestedChart.style.display = "flex";
  deselectAllChartTypes();

  updateSelectedTags();
  updateInsertButton();
  updateChartSuggestion();
  updateWelcomeScreen();
  hideError();
}

// ═══════════════════════════════════════════════════════
// LOADING STATES
// ═══════════════════════════════════════════════════════

function showLoading() {
  state.isLoading = true;
  DOM.loadingOverlay.style.display = "flex";
  DOM.btnInsert.disabled = true;
  DOM.loadingOverlay.querySelectorAll(".loading-step").forEach(step => {
    step.classList.remove("active", "done");
    step.querySelector(".loading-step__icon").textContent = "⏳";
  });
}

function updateLoadingStep(stepNumber) {
  DOM.loadingOverlay.querySelectorAll(".loading-step").forEach(step => {
    const sn = parseInt(step.dataset.step, 10);
    if (sn < stepNumber) {
      step.classList.remove("active");
      step.classList.add("done");
      step.querySelector(".loading-step__icon").textContent = "✓";
    } else if (sn === stepNumber) {
      step.classList.add("active");
      step.classList.remove("done");
      step.querySelector(".loading-step__icon").textContent = "⏳";
    } else {
      step.classList.remove("active", "done");
      step.querySelector(".loading-step__icon").textContent = "⏳";
    }
  });
}

function hideLoading() {
  state.isLoading = false;
  DOM.loadingOverlay.style.display = "none";
  updateInsertButton();
}

// ═══════════════════════════════════════════════════════
// ERROR & SUCCESS STATES
// ═══════════════════════════════════════════════════════

function showError(message) {
  DOM.errorBanner.classList.remove("error-banner--info");
  DOM.errorMessage.textContent = message;
  DOM.errorBanner.style.display = "block";
  state.lastError = message;
}

function showNotes(lines) {
  DOM.errorMessage.textContent = "Remarques :\n• " + lines.join("\n• ");
  DOM.errorBanner.classList.add("error-banner--info");
  DOM.errorBanner.style.display = "block";
}

function hideError() {
  DOM.errorBanner.classList.remove("error-banner--info");
  DOM.errorBanner.style.display = "none";
  state.lastError = null;
}

function showSuccessToast(message) {
  const textEl = DOM.successToast.querySelector(".success-toast__text");
  if (textEl && message) { textEl.textContent = message; }
  DOM.successToast.style.display = "flex";
  setTimeout(() => { DOM.successToast.style.display = "none"; }, 3000);
}

// ═══════════════════════════════════════════════════════
// CORE: INSERT CHART HANDLER
// ═══════════════════════════════════════════════════════

async function handleInsertChart() {
  if (state.isLoading) return;
  if (state.selectedIndicators.size === 0) return;

  state.lastAction = handleInsertChart;
  hideError();
  showLoading();

  try {
    // Step 1: Connect
    updateLoadingStep(1);

    const selectedIndicators = [...state.selectedIndicators]
      .map(id => INDICATORS_BY_ID[id])
      .filter(Boolean);

    if (selectedIndicators.length === 0) {
      throw new Error("Aucun indicateur valide sélectionné.");
    }

    const filters = {
      region: state.selectedRegion,
      city: state.selectedCity,
      startYear: state.startYear,
      endYear: state.endYear
    };

    // Step 2: Fetch data
    updateLoadingStep(2);

    const fetchResults = await DataService.fetchMultipleIndicators(
      selectedIndicators, filters
    );

    const successfulResults = fetchResults.filter(
      r => r.result && r.result.records.length > 0
    );
    const failedResults = fetchResults.filter(
      r => r.error || !r.result || r.result.records.length === 0
    );

    if (successfulResults.length === 0) {
      throw new Error(fetchResults.map(r => r.error || ("Aucune donnée pour « " + r.indicator.label + " »")).join("\n"));
    }

    if (failedResults.length > 0) {
      console.warn("[HCP Charts] Partial failures:",
        failedResults.map(r => r.indicator.label + ": " + (r.error || "no data"))
      );
    }

    // Step 3: Normalize
    updateLoadingStep(3);

    const normalizedData = DataNormalizer.normalizeMultiSeries(
      successfulResults.map(r => ({ indicator: r.indicator, result: r.result })),
      filters
    );

    const notes = [
      ...failedResults.map(r => r.error || ("« " + r.indicator.label + " » : aucune donnée")),
      ...normalizedData.errors.map(e => "« " + e.indicator.label + " » : " + e.error),
      ...normalizedData.warnings
    ];

    if (!normalizedData.labels.length || !normalizedData.series.length) {
      throw new Error(notes.length ? notes.join("\n") :
        "Aucune valeur pour ces filtres (période ou région).");
    }

    // Step 4: Build chart
    updateLoadingStep(4);

    let chartType;
    const units = normalizedData.series.map(s => s.unit);
    const shape = { seriesCount: normalizedData.series.length, pointCount: normalizedData.labels.length, units };
    if (state.autoChartType || !state.selectedChartType) {
      chartType = suggestChartType({ indicatorCount: shape.seriesCount, isSnapshot: shape.pointCount === 1, units }).primary;
    } else {
      chartType = CHARTS_BY_ID[state.selectedChartType];
    }
    if (!chartType) { chartType = CHARTS_BY_ID["column_clustered"]; }
    const compat = checkCompatibility(chartType, shape);
    if (!compat.ok) {
      throw new Error("« " + chartType.label + " » nécessite " + compat.reason + ". Choisissez un autre type ou passez en automatique.");
    }

    const labelParams = {
      indicators: selectedIndicators.filter(ind =>
        normalizedData.series.some(s => s.name === ind.label)
      ),
      region: state.selectedRegion,
      city: state.selectedCity,
      startYear: state.startYear,
      endYear: state.endYear
    };

    const base64Pptx = await ChartEngine.buildChart({
      chartType: chartType,
      labels: normalizedData.labels,
      series: normalizedData.series,
      filterParams: labelParams
    });

    // Step 5: Insert
    updateLoadingStep(5);

    const fileName = LabelBuilder.buildFileName(labelParams);
    const insertResult = await OfficeService.smartInsert(base64Pptx, {
      useTheme: true,
      fileName: fileName + ".pptx"
    });

    // Success
    hideLoading();

    showSuccessToast(insertResult.message);
    if (notes.length) showNotes(notes);

    console.log("[HCP Charts] Chart inserted:", {
      chartType: chartType.label,
      indicators: selectedIndicators.map(i => i.label),
      labels: normalizedData.labels.length,
      series: normalizedData.series.length,
      method: successfulResults[0]?.result?.method || "unknown"
    });

  } catch (error) {
    console.error("[HCP Charts] Insert error:", error);
    hideLoading();
    showError(error.message || STRINGS.errors.generic);
  }
}

// ═══════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
