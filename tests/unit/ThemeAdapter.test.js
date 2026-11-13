import { describe, it, expect } from "vitest";
import { themeColors, themeFonts, adaptSeries } from "../../src/services/ThemeAdapter.js";

describe("ThemeAdapter", () => {
  it("maps greys to tx1 tints, white to bg1, keeps saturated colours", () => {
    expect(themeColors('<a:srgbClr val="000000"/>')).toBe('<a:schemeClr val="tx1"/>');
    expect(themeColors('<a:srgbClr val="FFFFFF"/>')).toBe('<a:schemeClr val="bg1"/>');
    expect(themeColors('<a:srgbClr val="7F7F7F"/>')).toMatch(/schemeClr val="tx1"><a:lumMod/);
    expect(themeColors('<a:srgbClr val="F2F2F2"/>')).toMatch(/schemeClr val="bg1"><a:lumMod/);
    expect(themeColors('<a:srgbClr val="2E7D32"/>')).toBe('<a:srgbClr val="2E7D32"/>');
    expect(themeColors('<a:srgbClr val="000000"><a:alpha val="50000"/></a:srgbClr>'))
      .toBe('<a:schemeClr val="tx1"><a:alpha val="50000"/></a:schemeClr>');
  });
  it("points fonts at the theme, keeps theme tokens", () => {
    expect(themeFonts('<a:latin typeface="Arial"/><a:latin typeface="+mj-lt"/>'))
      .toBe('<a:latin typeface="+mn-lt"/><a:latin typeface="+mj-lt"/>');
  });
  it("shades series 7+ and hides requested categories", () => {
    const ser = (i) => `<c:ser><c:idx val="${i}"/><c:spPr><a:solidFill><a:schemeClr val="accent${(i % 6) + 1}"/></a:solidFill></c:spPr></c:ser>`;
    expect(adaptSeries(ser(0))).toContain('<a:schemeClr val="accent1"/>');
    expect(adaptSeries(ser(7))).toContain('<a:schemeClr val="accent2"><a:lumMod val="75000"/></a:schemeClr>');
    const dough = '<c:ser><c:idx val="0"/><c:dPt><c:idx val="2"/><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></c:spPr></c:dPt>' +
      '<c:cat><c:strRef><c:strCache><c:pt idx="2"><c:v>__hidden</c:v></c:pt></c:strCache></c:strRef></c:cat></c:ser>';
    expect(adaptSeries(dough, [], ["__hidden"])).toContain('<c:spPr><a:noFill/>');
  });
});
