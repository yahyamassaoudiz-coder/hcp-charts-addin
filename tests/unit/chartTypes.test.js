import { describe, it, expect } from "vitest";
import { suggestChartType, checkCompatibility, CHARTS_BY_ID, CHART_STATS } from "../../src/constants/chartTypes.js";

describe("suggestChartType", () => {
  it("is context-aware", () => {
    expect(suggestChartType({ indicatorCount: 1, isSnapshot: true, units: ["%"] }).primary.id).toBe("kpi_cards");
    expect(suggestChartType({ indicatorCount: 1, isSnapshot: false, units: ["%"] }).primary.id).toBe("line_markers");
    expect(suggestChartType({ indicatorCount: 2, isSnapshot: false, units: ["%", "Mrd MAD"] }).primary.id).toBe("combo");
    expect(suggestChartType({ indicatorCount: 4, isSnapshot: false, units: ["%", "MAD", "%", "ans"] }).primary.id).toBe("small_multiples");
    expect(suggestChartType({ indicatorCount: 3, isSnapshot: false, units: ["%", "%", "%"] }).primary.id).toBe("line_markers");
  });
  it("every suggestion is compatible with its own context", () => {
    const ctx = { indicatorCount: 2, isSnapshot: false, units: ["%", "Mrd MAD"] };
    const s = suggestChartType(ctx);
    for (const c of [s.primary, ...s.alternatives]) {
      expect(checkCompatibility(c, { seriesCount: 2, pointCount: 5, units: ctx.units }).ok).toBe(true);
    }
  });
  it("rejects incompatible shapes", () => {
    expect(checkCompatibility(CHARTS_BY_ID.column_stacked, { seriesCount: 2, pointCount: 5, units: ["%", "MAD"] }).ok).toBe(false);
    expect(checkCompatibility(CHARTS_BY_ID.pie, { seriesCount: 2, pointCount: 5, units: ["%", "%"] }).ok).toBe(false);
    expect(CHART_STATS.total).toBe(28);
  });
});
