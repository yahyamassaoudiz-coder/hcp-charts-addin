import { describe, it, expect } from "vitest";
import { buildTitle, buildSubtitle, buildYAxisTitle, buildSourceNote, buildFileName } from "../../src/services/LabelBuilder.js";

describe("buildTitle", () => {
  it("shows indicator + region", () => {
    const r = buildTitle({ indicators: [{ label: "Taux de chômage" }], region: "Casa", city: null });
    expect(r).toContain("Taux de chômage");
    expect(r).toContain("Casa");
  });
  it("shows national when no geo", () => {
    const r = buildTitle({ indicators: [{ label: "PIB" }], region: null });
    expect(r).toContain("National");
  });
});

describe("buildYAxisTitle", () => {
  it("shows label + unit for single KPI", () => {
    expect(buildYAxisTitle({ indicators: [{ label: "Chômage", unit: "%" }] })).toBe("Chômage (%)");
  });
  it("returns empty for mixed units", () => {
    expect(buildYAxisTitle({ indicators: [{ label: "A", unit: "%" }, { label: "B", unit: "MAD" }] })).toBe("");
  });
});

describe("buildSourceNote", () => {
  it("contains HCP", () => { expect(buildSourceNote()).toContain("HCP"); });
});

describe("buildFileName", () => {
  it("generates clean filename", () => {
    const r = buildFileName({ indicators: [{ id: "pib" }], region: "Rabat", startYear: 2015, endYear: 2024 });
    expect(r).toContain("hcp_");
    expect(r).toContain("pib");
  });
});
