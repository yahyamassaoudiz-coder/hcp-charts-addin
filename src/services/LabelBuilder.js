/**
 * LabelBuilder.js — Dynamic Chart Label Generator
 * Generates chart titles, subtitles, axis labels, and source notes.
 */

import STRINGS, { t } from "../constants/strings.js";

export function buildTitle(params) {
  const { indicators = [], region = null, city = null } = params;
  let indicatorText;
  if (indicators.length === 0) {
    indicatorText = STRINGS.chart.noTitle;
  } else if (indicators.length === 1) {
    indicatorText = indicators[0].label;
  } else if (indicators.length <= 3) {
    indicatorText = indicators.map(i => i.label).join(", ");
  } else {
    indicatorText = `${indicators[0].label} et ${indicators.length - 1} autres`;
  }
  let geoText;
  if (city) { geoText = city; }
  else if (region) { geoText = region; }
  else { geoText = STRINGS.chart.national; }
  return `${indicatorText} — ${geoText}`;
}

export function buildSubtitle(params) {
  const { indicators = [], region = null, city = null,
          startYear = null, endYear = null } = params;
  const parts = [];
  if (city && region) {
    parts.push(`${STRINGS.chart.regionPrefix} ${region}`);
  }
  if (startYear && endYear) {
    if (startYear === endYear) {
      parts.push(`${startYear}`);
    } else {
      parts.push(t(STRINGS.chart.yearRange, { start: startYear, end: endYear }));
    }
  }
  if (indicators.length > 0) {
    const units = [...new Set(indicators.map(i => i.unit))];
    if (units.length === 1) {
      parts.push(`${STRINGS.chart.unitPrefix} ${units[0]}`);
    }
  }
  return parts.join(" • ");
}

export function buildXAxisTitle(params) {
  return STRINGS.chart.axisYear;
}

export function buildYAxisTitle(params) {
  const { indicators = [] } = params;
  if (indicators.length === 0) return "";
  if (indicators.length === 1) {
    const ind = indicators[0];
    return `${ind.label} (${ind.unit})`;
  }
  const units = [...new Set(indicators.map(i => i.unit))];
  if (units.length === 1) return units[0];
  return "";
}

export function buildSourceNote() {
  return STRINGS.chart.source;
}

export function buildAllLabels(params) {
  return {
    title: buildTitle(params),
    subtitle: buildSubtitle(params),
    xAxisTitle: buildXAxisTitle(params),
    yAxisTitle: buildYAxisTitle(params),
    sourceNote: buildSourceNote(),
    hasSubtitle: buildSubtitle(params).length > 0,
    hasYAxis: buildYAxisTitle(params).length > 0,
    indicatorCount: params.indicators ? params.indicators.length : 0
  };
}

export function buildFileName(params) {
  const { indicators = [], region = null, startYear, endYear } = params;
  const parts = [];
  if (indicators.length > 0) parts.push(indicators[0].id);
  if (region) parts.push(region.toLowerCase().replace(/[^a-z0-9]+/g, "_"));
  if (startYear && endYear) parts.push(`${startYear}_${endYear}`);
  return `hcp_${parts.join("_")}`;
}

const LabelBuilder = {
  buildTitle, buildSubtitle, buildXAxisTitle, buildYAxisTitle,
  buildSourceNote, buildAllLabels, buildFileName
};
export default LabelBuilder;
